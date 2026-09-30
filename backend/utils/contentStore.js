import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../config/logger.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.join(HERE, '..', 'content', 'testcases.json');
const QUIZ_BUNDLE = path.join(HERE, '..', 'content', 'quiz-answers.json');

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
    if (!cache) cache = loadBundle(BUNDLE, 'grading');
    return cache;
}

function loadQuizAnswers() {
    if (!quizCache) quizCache = loadBundle(QUIZ_BUNDLE, 'quiz answer');
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
