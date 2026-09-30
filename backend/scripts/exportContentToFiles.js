import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Question from '../models/Question.js';

/**
 * One-time export: Mongo → `content/`.
 *
 * After this runs, `content/` is the source of truth and this script is
 * historical. It exists as a committed artifact so the migration is
 * reproducible and reviewable rather than a thing someone did by hand once.
 *
 * The mapping is where the modelling fix happens. Today every item is a
 * `Question` discriminated by `domain` + `answerFormat`; here that collapses
 * into three real types:
 *
 *   answerFormat=code        → problem
 *   answerFormat=mcq         → quiz
 *   answerFormat=design_doc  → topic   (System Design stops pretending to be
 *                                       something you solve)
 *
 * Usage:  node scripts/exportContentToFiles.js [--dry]
 */

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../../content');
const DRY = process.argv.includes('--dry');

function slugify(value) {
    return String(value)
        .normalize('NFKD')
        .toLowerCase()
        .replace(/['']/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Turn a design_doc question into the Topic body it should have been. */
function designPromptToMarkdown(doc) {
    const p = doc.designPrompt || {};
    const sections = [];

    if (doc.description) sections.push(doc.description.trim());
    if (p.scenario) sections.push(`## Scenario\n\n${p.scenario.trim()}`);

    const bullets = (heading, arr) =>
        Array.isArray(arr) && arr.length > 0
            ? `## ${heading}\n\n${arr.map((x) => `- ${x}`).join('\n')}`
            : null;

    for (const section of [
        bullets('Requirements', p.requirements),
        bullets('Constraints', p.constraints),
        bullets('What a strong answer covers', p.evaluationCriteria),
    ]) {
        if (section) sections.push(section);
    }

    if (p.sampleAnswer) sections.push(`## Reference walkthrough\n\n${p.sampleAnswer.trim()}`);

    return sections.join('\n\n').trim();
}

function toContentItem(doc) {
    const link = doc.link || doc.name;
    const slug = slugify(link);
    const common = {
        slug,
        // The slug is derived from `link`, so for well-formed links the two
        // are identical and storing both would be noise. Keep `link` only
        // when slugify actually changed something, so routing never has to
        // assume the round-trip was lossless.
        ...(link !== slug ? { link } : {}),
        title: doc.name,
        domain: doc.domain || 'algorithms',
        group: doc.group,
        order: typeof doc.order === 'number' ? doc.order : 0,
        tags: [],
        lists: Array.isArray(doc.list) ? doc.list.filter(Boolean) : [],
        legacyId: String(doc._id),
    };

    if (doc.answerFormat === 'design_doc') {
        const body = designPromptToMarkdown(doc);
        return {
            ...common,
            type: 'topic',
            domain: 'system_design',
            summary: (doc.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280),
            body: body || doc.name,
            keyTakeaways: Array.isArray(doc.designPrompt?.evaluationCriteria)
                ? doc.designPrompt.evaluationCriteria
                : [],
            prerequisites: [],
            relatedProblems: [],
        };
    }

    if (doc.answerFormat === 'mcq') {
        return {
            ...common,
            type: 'quiz',
            difficulty: doc.difficulty,
            description: doc.description || '',
            options: (doc.mcqOptions || []).map((o, i) => ({
                id: o.id || `opt-${i + 1}`,
                text: o.text,
                isCorrect: Boolean(o.isCorrect),
                explanation: o.explanation || '',
            })),
        };
    }

    const clean = (tc) => ({
        inputs: (tc.inputs || []).map(String),
        expectedOutput: String(tc.expectedOutput ?? ''),
        explanation: tc.explanation || '',
    });

    return {
        ...common,
        type: 'problem',
        difficulty: doc.difficulty,
        description: doc.description || '',
        templates: {
            python: doc.templates?.python || '',
            javascript: doc.templates?.javascript || '',
        },
        ...(doc.types?.output || doc.types?.inputs?.length
            ? { types: { inputs: doc.types.inputs || [], ...(doc.types.output ? { output: doc.types.output } : {}) } }
            : {}),
        exampleTestCases: (doc.exampleTestCases || []).map(clean),
        testCases: (doc.testCases || []).map((tc) => ({
            ...clean(tc),
            isHidden: tc.isHidden !== false,
        })),
    };
}

const DEST = {
    problem: (item) => path.join(CONTENT_DIR, 'problems', item.domain),
    quiz: (item) => path.join(CONTENT_DIR, 'quizzes', item.domain),
    topic: () => path.join(CONTENT_DIR, 'topics'),
};

async function main() {
    const uri =
        process.env.NODE_ENV === 'production' ? process.env.MONGO_URI : process.env.MONGO_URI_DEV;
    if (!uri) {
        console.error('No Mongo URI configured (MONGO_URI_DEV / MONGO_URI).');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log(`Connected: ${mongoose.connection.host}`);

    const docs = await Question.find({}).lean();
    console.log(`Read ${docs.length} questions`);

    const items = docs.map(toContentItem);

    const bySlug = new Map();
    for (const item of items) {
        if (bySlug.has(item.slug)) {
            console.warn(`⚠ duplicate slug "${item.slug}" — keeping first`);
            continue;
        }
        bySlug.set(item.slug, item);
    }

    const counts = {};
    for (const item of bySlug.values()) {
        counts[item.type] = (counts[item.type] || 0) + 1;
        if (DRY) continue;
        const dir = DEST[item.type](item);
        await mkdir(dir, { recursive: true });
        await writeFile(
            path.join(dir, `${item.slug}.json`),
            `${JSON.stringify(item, null, 2)}\n`,
        );
    }

    console.log(`${DRY ? 'Would write' : 'Wrote'} ${bySlug.size} items:`, counts);
    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
