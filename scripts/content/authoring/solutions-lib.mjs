/**
 * Shared helpers for the solution verifier and the case recorder.
 *
 * A solutions file lives at scripts/content/solutions/<slug>.py (or <slug>.js
 * for a problem graded in JavaScript) and holds any number of complete
 * submissions, each introduced by a marker line:
 *
 *   # @solution <name> <accept|tle|reject>      (Python)
 *   // @solution <name> <accept|tle|reject>     (JavaScript)
 *
 *   accept  must pass every example and hidden case, comfortably within time
 *   tle     must pass the examples, never answer wrongly, and hit the time limit
 *   reject  must fail at least one case with a wrong answer or error
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
export const SOLUTIONS_DIR = path.join(REPO_ROOT, 'scripts/content/solutions');
const PROBLEMS_DIR = path.join(REPO_ROOT, 'content/problems');

export const EXPECTATIONS = ['accept', 'tle', 'reject'];
const MARKER = /^(?:#|\/\/) @solution\s+(\S+)\s+(\S+)\s*$/;

export const parseSolutions = (text, file = 'solutions') => {
    const solutions = [];
    let current = null;
    for (const line of text.split('\n')) {
        const match = line.match(MARKER);
        if (match) {
            if (!EXPECTATIONS.includes(match[2])) {
                throw new Error(`${file}: solution "${match[1]}" has unknown expectation "${match[2]}"`);
            }
            current = { name: match[1], expect: match[2], lines: [] };
            solutions.push(current);
        } else if (current) {
            current.lines.push(line);
        }
    }
    const names = new Set();
    return solutions.map(({ name, expect, lines }) => {
        if (names.has(name)) throw new Error(`${file}: duplicate solution name "${name}"`);
        names.add(name);
        return { name, expect, code: `${lines.join('\n').trim()}\n` };
    });
};

export const solutionsPath = (slug, language = 'python') =>
    path.join(SOLUTIONS_DIR, `${slug}.${language === 'javascript' ? 'js' : 'py'}`);

export const loadSolutions = async (slug, language = 'python') => {
    const file = solutionsPath(slug, language);
    try {
        return parseSolutions(await readFile(file, 'utf8'), path.relative(REPO_ROOT, file));
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
};

/** Every gradable problem: { slug, file, item }. */
export const listProblems = async () => {
    const problems = [];
    for (const domain of await readdir(PROBLEMS_DIR)) {
        const dir = path.join(PROBLEMS_DIR, domain);
        for (const name of (await readdir(dir)).filter((n) => n.endsWith('.json')).sort()) {
            const file = path.join(dir, name);
            const item = JSON.parse(await readFile(file, 'utf8'));
            if (item.type === 'problem') problems.push({ slug: item.slug, file, item });
        }
    }
    return problems;
};

export const findProblem = async (slug) => {
    const problem = (await listProblems()).find((p) => p.slug === slug);
    if (!problem) throw new Error(`No problem with slug "${slug}"`);
    return problem;
};

export const saveProblem = (file, item) => writeFile(file, `${JSON.stringify(item, null, 2)}\n`);

export const preview = (value, limit = 160) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (text === undefined) return String(value);
    return text.length > limit ? `${text.slice(0, limit)}… (${text.length} chars)` : text;
};
