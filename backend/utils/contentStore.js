import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../config/logger.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTENT_DIR = path.join(HERE, '..', 'content');

/**
 * Where the build writes the server bundles. `CONTENT_BUNDLE_DIR` lets a
 * deployment mount content apart from the code and lets tests load fixtures
 * without touching the real build output. Resolved per load, not at import.
 */
const bundlePath = (file) => path.join(process.env.CONTENT_BUNDLE_DIR || DEFAULT_CONTENT_DIR, file);

/**
 * Server-side grading bundle, emitted by `npm run build:content` from the
 * `content/` sources. It is deliberately not published to the CDN: the public
 * artifact carries only `exampleTestCases`, so hidden cases and their expected
 * outputs exist solely here.
 *
 * This is the single source of truth for grading. The database holds per-user
 * progress, not problem content, so authoring a problem and rebuilding is
 * enough to make it solvable — no database sync step, and no way for the two
 * to drift apart.
 */
let cache = null;
let quizCache = null;
let catalogCache = null;

function loadBundle(file, label) {
    try {
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
        // Missing bundle is a deployment error, not a per-request one. Fail
        // closed with an empty map so callers return "not gradable" rather
        // than silently grading against nothing.
        logger.error(
            { err, bundle: file },
            `${label} bundle missing or unreadable — run \`npm run build:content\``,
        );
        return {};
    }
}

function load() {
    if (!cache) cache = loadBundle(bundlePath('testcases.json'), 'grading');
    return cache;
}

function loadQuizAnswers() {
    if (!quizCache) quizCache = loadBundle(bundlePath('quiz-answers.json'), 'quiz answer');
    return quizCache;
}

/** Strip the trailing slash some stored links carry. */
function normalize(slug) {
    return String(slug || '').replace(/\/+$/, '');
}

/**
 * Grading spec for a slug, or null when the problem has no test cases.
 * `types` may be null for problems authored before types were required.
 */
export function getGradingSpec(slug) {
    const entry = load()[normalize(slug)];
    if (!entry || !Array.isArray(entry.testCases) || entry.testCases.length === 0) {
        return null;
    }
    return { types: entry.types ?? null, testCases: entry.testCases };
}

/** Number of hidden cases, for display. Anything not explicitly public counts. */
export function getHiddenTestCaseCount(slug) {
    const spec = getGradingSpec(slug);
    if (!spec) return 0;
    return spec.testCases.filter((tc) => tc.isHidden !== false).length;
}

/**
 * Strip inputs and expected outputs from hidden cases before returning results
 * to the client. A learner sees which hidden case failed, but not the answer
 * key — the same guarantee the published bundle makes.
 */
export function redactHiddenResults(results, testCases) {
    return results.map((r, i) => {
        if (testCases[i]?.isHidden === false) return r;
        return {
            passed: r.passed,
            status: r.status,
            runtimeMs: r.runtimeMs,
            hidden: true,
            testCase: `Hidden test ${i + 1}`,
            error: r.error,
        };
    });
}

/** Test seam: drop the cached bundle so the next read hits disk. */
export function resetContentCache() {
    cache = null;
    quizCache = null;
    catalogCache = null;
}

/**
 * Public metadata for every content item — the same allowlisted bodies the
 * CDN serves, in the same order as the published index. The backend reads
 * question metadata from here rather than from a database collection, so
 * content has exactly one source: the git-authored `content/` tree.
 */
function loadCatalog() {
    if (!catalogCache) {
        const raw = loadBundle(bundlePath('catalog.json'), 'catalog');
        const items = Array.isArray(raw.items) ? raw.items : [];
        catalogCache = {
            revision: raw.revision || null,
            items,
            bySlug: new Map(items.map((item) => [item.slug, item])),
            byLegacyId: new Map(
                items.filter((item) => item.legacyId).map((item) => [item.legacyId, item]),
            ),
        };
    }
    return catalogCache;
}

/** Every catalog item in index order. Shared — callers must not mutate. */
export function listItems() {
    return loadCatalog().items;
}

export function getContentRevision() {
    return loadCatalog().revision;
}

export function assertContentRevision(item, revision) {
    if (revision !== undefined && revision !== item?.revision) {
        const error = new Error('This content has changed. Reload the question before submitting.');
        error.statusCode = 409;
        throw error;
    }
}

/** Look up by slug. Accepts legacy `link` values, which are the slug plus a trailing slash. */
export function getItemBySlug(slug) {
    return loadCatalog().bySlug.get(normalize(slug)) || null;
}

/**
 * Look up by the id progress is keyed on. Items that predate the content
 * tree carry the database id they were exported with, so existing solve
 * history and recommendation batches keep resolving.
 */
export function getItemByLegacyId(id) {
    if (id === null || id === undefined) return null;
    return loadCatalog().byLegacyId.get(String(id)) || null;
}

const ANSWER_FORMAT = { problem: 'code', quiz: 'mcq', topic: 'design_doc' };

/** The solver an item opens in, in the vocabulary older clients understand. */
export function answerFormatFor(item) {
    return ANSWER_FORMAT[item?.type] ?? null;
}

/**
 * The summary shape clients have always received for a question: the fields
 * list rows, recommendation cards and progress stats read. Built only from
 * public catalog fields, so it cannot carry answer keys however it is used.
 */
export function toQuestionSummary(item) {
    if (!item) return null;
    return {
        _id: item.legacyId ?? null,
        name: item.title,
        link: item.link || item.slug,
        slug: item.slug,
        type: item.type,
        group: item.group,
        difficulty: item.difficulty ?? null,
        domain: item.domain,
        answerFormat: answerFormatFor(item),
        ...(item.topic ? { topic: item.topic } : {}),
    };
}

/**
 * Grade a multiple-choice answer against the server-side answer key.
 *
 * The published quiz body carries option text but never `isCorrect` — the key
 * lives only here, alongside the hidden test cases, for the same reason. Grading
 * is keyed by content slug rather than a database id so a quiz is gradable the
 * moment it is authored and built, with no database row to create.
 *
 * Returns null when the slug has no answer key, which callers surface as 404
 * rather than as a wrong answer.
 */
export function gradeQuiz(slug, selectedOptionId) {
    const options = loadQuizAnswers()[normalize(slug)];
    if (!Array.isArray(options) || options.length === 0) return null;

    const correct = options.find((o) => o.isCorrect);
    const chosen = options.find((o) => o.id === selectedOptionId) || null;

    return {
        passed: Boolean(chosen?.isCorrect),
        selectedOptionId: chosen ? chosen.id : null,
        correctOptionId: correct ? correct.id : null,
        // Every option's explanation, so the UI can teach why the distractors
        // are wrong instead of only confirming the right answer.
        explanations: options.map(({ id, isCorrect, explanation }) => ({
            id,
            isCorrect: Boolean(isCorrect),
            explanation: explanation || '',
        })),
    };
}
