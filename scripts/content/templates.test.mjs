import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROBLEMS = path.join(ROOT, 'content/problems');

async function loadProblems() {
    const out = [];
    const walk = async (dir) => {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) await walk(full);
            else if (entry.name.endsWith('.json')) out.push(JSON.parse(await readFile(full, 'utf8')));
        }
    };
    await walk(PROBLEMS);
    return out;
}

// A starter template is the first thing a learner sees and the code they edit.
// The authoring gate only ever executes the reference solution, so a template
// that does not parse ships undetected and breaks the problem for every user.
test('starter templates parse in their target language', async () => {
    const problems = await loadProblems();
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'tpl-'));
    const broken = { python: [], javascript: [] };

    try {
        for (const problem of problems) {
            const { python, javascript } = problem.templates ?? {};

            if (python) {
                const file = path.join(tmp, 'check.py');
                await writeFile(file, `from typing import List, Optional\n${python}`);
                try {
                    await run('python3', ['-m', 'py_compile', file]);
                } catch {
                    broken.python.push(problem.slug);
                }
            }

            if (javascript) {
                const file = path.join(tmp, 'check.js');
                await writeFile(file, javascript);
                try {
                    await run('node', ['--check', file]);
                } catch {
                    broken.javascript.push(problem.slug);
                }
            }
        }
    } finally {
        await rm(tmp, { recursive: true, force: true });
    }

    assert.deepEqual(broken, { python: [], javascript: [] }, `templates failed to parse: ${JSON.stringify(broken)}`);
});

// Hidden tests exist so a learner cannot read the answer key off the page.
// The published examples are mirrored as the leading test cases and stay
// visible; everything after them must be hidden. A regression here silently
// turns graded tests back into published ones.
test('test cases hide everything past the published examples', async () => {
    const problems = await loadProblems();
    const offenders = [];

    for (const problem of problems) {
        const exampleCount = problem.exampleTestCases?.length ?? 0;
        const cases = problem.testCases ?? [];
        if (cases.length <= exampleCount) continue; // no hidden cases to protect

        const actual = cases.map((testCase) => Boolean(testCase.isHidden));
        const expected = cases.map((_, index) => index >= exampleCount);
        if (actual.join() !== expected.join()) offenders.push(problem.slug);
    }

    assert.deepEqual(offenders, [], `isHidden does not follow the example prefix: ${offenders.join(', ')}`);
});
