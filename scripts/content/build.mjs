#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { GROUP_ORDER, groupRank } from '../../content/groupOrder.js';
import { contentItemSchema, toIndexEntry } from '../../content/schema.js';

/**
 * Compiles `content/` into content-hashed artifacts.
 *
 * Two invariants this script exists to guarantee:
 *
 *  1. Malformed content fails here, not in production. Zod validates every
 *     item and the script exits non-zero on the first batch of failures.
 *  2. Hidden test cases never reach the browser. They are written to a
 *     separate server-only artifact. The published item bodies are built from
 *     an explicit allowlist of fields, so adding a secret field to the schema
 *     later cannot silently leak it.
 *
 * Output is deterministic: keys are sorted and items are ordered, so repeated
 * builds of unchanged content produce byte-identical files and therefore
 * identical hashes. That is what makes `immutable` caching safe.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SOURCE_DIR = path.join(ROOT, 'content');
const PUBLIC_OUT = path.join(ROOT, 'frontend/public/content');
const SERVER_OUT = path.join(ROOT, 'backend/content');

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

/** JSON.stringify with recursively sorted object keys, for reproducibility. */
function stable(value) {
    return JSON.stringify(value, (_key, val) => {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            return Object.keys(val)
                .sort()
                .reduce((acc, k) => {
                    acc[k] = val[k];
                    return acc;
                }, {});
        }
        return val;
    });
}

async function collectSourceFiles(dir) {
    const out = [];
    let entries;
    try {
        entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
        if (err.code === 'ENOENT') return out;
        throw err;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...(await collectSourceFiles(full)));
        } else if (entry.name.endsWith('.json')) {
            out.push(full);
        }
    }
    return out;
}

/**
 * Explicit allowlist per type. Anything not named here is not published,
 * which is why `testCases` cannot leak by accident.
 */
function publicBody(item) {
    const common = {
        slug: item.slug,
        type: item.type,
        title: item.title,
        domain: item.domain,
        group: item.group,
        order: item.order,
        tags: item.tags,
        lists: item.lists,
        legacyId: item.legacyId,
        ...(item.link ? { link: item.link } : {}),
    };

    if (item.type === 'problem') {
        return {
            ...common,
            difficulty: item.difficulty,
            description: item.description,
            templates: item.templates,
            types: item.types ?? null,
            exampleTestCases: item.exampleTestCases,
        };
    }
    if (item.type === 'quiz') {
        return {
            ...common,
            difficulty: item.difficulty,
            description: item.description,
            ...(item.topic ? { topic: item.topic } : {}),
            // `isCorrect` and `explanation` are deliberately dropped. Anything
            // published here is readable by anyone who opens devtools, so the
            // key stays server-side and the client learns the answer only in
            // the response to a submitted attempt.
            options: item.options.map((o) => ({ id: o.id, text: o.text })),
        };
    }
    if (item.type === 'module') {
        return { ...common, summary: item.summary };
    }
    return {
        ...common,
        summary: item.summary,
        module: item.module,
        kind: item.kind,
        body: item.body,
        keyTakeaways: item.keyTakeaways,
        prerequisites: item.prerequisites,
        relatedProblems: item.relatedProblems,
    };
}

async function main() {
    const files = await collectSourceFiles(SOURCE_DIR);
    if (files.length === 0) {
        console.error(`No content found under ${path.relative(ROOT, SOURCE_DIR)}`);
        process.exit(1);
    }

    const items = [];
    const errors = [];

    for (const file of files) {
        const rel = path.relative(ROOT, file);
        let raw;
        try {
            raw = JSON.parse(await readFile(file, 'utf8'));
        } catch (err) {
            errors.push(`${rel}: invalid JSON — ${err.message}`);
            continue;
        }
        const parsed = contentItemSchema.safeParse(raw);
        if (!parsed.success) {
            for (const issue of parsed.error.issues) {
                errors.push(`${rel}: ${issue.path.join('.') || '(root)'} — ${issue.message}`);
            }
            continue;
        }
        items.push({ item: parsed.data, rel });
    }

    // Referential integrity. A prerequisite pointing at a slug that does not
    // exist is a broken learning path, and is exactly the class of bug that
    // used to surface as an empty page in production.
    const slugs = new Set(items.map(({ item }) => item.slug));
    const moduleSlugs = new Set(
        items.filter(({ item }) => item.type === 'module').map(({ item }) => item.slug),
    );
    const topicSlugs = new Set(
        items.filter(({ item }) => item.type === 'topic').map(({ item }) => item.slug),
    );
    const seen = new Map();
    for (const { item, rel } of items) {
        if (seen.has(item.slug)) {
            errors.push(`${rel}: duplicate slug "${item.slug}" (also in ${seen.get(item.slug)})`);
        }
        seen.set(item.slug, rel);

        for (const dep of item.prerequisites ?? []) {
            if (!slugs.has(dep)) errors.push(`${rel}: prerequisite "${dep}" does not exist`);
        }
        for (const dep of item.relatedProblems ?? []) {
            if (!slugs.has(dep)) errors.push(`${rel}: relatedProblem "${dep}" does not exist`);
        }
        if (item.type === 'topic' && !moduleSlugs.has(item.module)) {
            errors.push(`${rel}: module "${item.module}" does not exist`);
        }
        if (item.type === 'quiz' && item.topic && !topicSlugs.has(item.topic)) {
            errors.push(`${rel}: topic "${item.topic}" does not exist`);
        }
        if (GROUP_ORDER[item.domain] && groupRank(item.domain, item.group) === -1) {
            errors.push(
                `${rel}: group "${item.group}" is not listed in GROUP_ORDER.${item.domain} (content/groupOrder.js)`,
            );
        }
    }

    if (errors.length > 0) {
        console.error(`\nContent validation failed (${errors.length} problem(s)):\n`);
        for (const e of errors.slice(0, 40)) console.error(`  • ${e}`);
        if (errors.length > 40) console.error(`  … and ${errors.length - 40} more`);
        console.error('');
        process.exit(1);
    }

    // The index order is the list order: the frontend groups entries in the
    // order it reads them, so sections appear in learning order, not A–Z.
    items.sort((a, b) => {
        const A = a.item;
        const B = b.item;
        return (
            A.domain.localeCompare(B.domain) ||
            groupRank(A.domain, A.group) - groupRank(B.domain, B.group) ||
            A.group.localeCompare(B.group) ||
            A.order - B.order ||
            A.slug.localeCompare(B.slug)
        );
    });

    await mkdir(path.join(PUBLIC_OUT, 'items'), { recursive: true });
    await mkdir(SERVER_OUT, { recursive: true });

    const indexEntries = [];
    const catalog = [];
    const hiddenTests = {};
    const quizAnswers = {};

    for (const { item } of items) {
        const pub = { ...publicBody(item), revision: hash(stable(item)) };
        const body = stable(pub);
        const h = hash(body);
        const entry = toIndexEntry(item);
        await writeFile(path.join(PUBLIC_OUT, 'items', `${item.slug}.${h}.json`), body);
        indexEntries.push({ ...entry, h });
        // Server-side twin of the published items: the backend reads problem
        // metadata from here instead of the database. Built from the same
        // allowlist, so it can never carry more than the CDN already serves.
        catalog.push({ ...pub, availableForSolve: entry.availableForSolve });

        if (item.type === 'problem' && item.testCases.length > 0) {
            hiddenTests[item.slug] = { types: item.types ?? null, testCases: item.testCases };
        }
        if (item.type === 'quiz') {
            quizAnswers[item.slug] = item.options.map((o) => ({
                id: o.id,
                isCorrect: o.isCorrect,
                explanation: o.explanation,
            }));
        }
    }

    const indexBody = stable({ version: 1, count: indexEntries.length, items: indexEntries });
    const indexHash = hash(indexBody);
    await writeFile(path.join(PUBLIC_OUT, `index.${indexHash}.json`), indexBody);

    // Unhashed pointer, served with a short TTL. Everything it points at is
    // immutable, so this is the only request that ever needs revalidating.
    const revision = hash(stable(items.map(({ item }) => item)));
    await writeFile(
        path.join(PUBLIC_OUT, 'manifest.json'),
        `${JSON.stringify({ version: 1, revision, index: `index.${indexHash}.json` }, null, 2)}\n`,
    );

    await writeFile(path.join(SERVER_OUT, 'testcases.json'), `${stable(hiddenTests)}\n`);
    await writeFile(path.join(SERVER_OUT, 'quiz-answers.json'), `${stable(quizAnswers)}\n`);
    await writeFile(
        path.join(SERVER_OUT, 'catalog.json'),
        `${stable({ version: 1, revision, count: catalog.length, items: catalog })}\n`,
    );

    const indexKb = (Buffer.byteLength(indexBody) / 1024).toFixed(1);
    const gzKb = (
        (await import('node:zlib')).gzipSync(Buffer.from(indexBody)).length / 1024
    ).toFixed(1);

    const byType = items.reduce((acc, { item }) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
    }, {});

    console.log(`✓ ${items.length} items validated (${JSON.stringify(byType)})`);
    console.log(`  index   ${indexKb} KB raw · ${gzKb} KB gz  → index.${indexHash}.json`);
    console.log(`  items   ${items.length} files → ${path.relative(ROOT, PUBLIC_OUT)}/items/`);
    console.log(
        `  hidden  ${Object.keys(hiddenTests).length} test sets, ${Object.keys(quizAnswers).length} answer keys → ${path.relative(ROOT, SERVER_OUT)}/`,
    );
    console.log(`  catalog ${catalog.length} public items → ${path.relative(ROOT, SERVER_OUT)}/catalog.json`);

    if (Number(gzKb) > 30) {
        console.warn(`⚠ index exceeds the 30 KB gz budget (${gzKb} KB)`);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
