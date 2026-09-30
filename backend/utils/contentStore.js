import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../config/logger.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.join(HERE, '..', 'content', 'testcases.json');

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

function load() {
    if (cache) return cache;
    try {
        cache = JSON.parse(readFileSync(BUNDLE, 'utf8'));
    } catch (err) {
        // Missing bundle is a deployment error, not a per-request one. Fail
        // closed with an empty map so callers return "not gradable" rather
        // than silently grading against nothing.
        logger.error(
            { err, bundle: BUNDLE },
            'grading bundle missing or unreadable — run `npm run build:content`',
        );
        cache = {};
    }
    return cache;
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
}
