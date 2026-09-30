/**
 * Expected-output generator and validation gate for authored problems.
 *
 * Hand-writing `expectedOutput` is the one thing we must never do: a wrong
 * expected value is worse than an empty problem, because a correct submission
 * then fails and the learner has no way to tell who is wrong. Instead we run a
 * reference solution through the *real* grading harness and record what it
 * actually produced, then re-grade the reference against those recorded values
 * and refuse to write anything unless it passes 100%.
 *
 * Usage:
 *   node scripts/content/authoring/solve.mjs <draft.json> [...]   # write
 *   node scripts/content/authoring/solve.mjs --check <slug> [...] # verify only
 *
 * A draft is a JSON file shaped like:
 *   {
 *     "slug": "binary-search",
 *     "description": "<div>...</div>",     // original prose, never copied
 *     "reference": "class Solution:\n    def search(...)",
 *     "templates": { "python": "...", "javascript": "..." },
 *     "exampleInputs": [ ["[-1,0,3,5,9,12]", "9"], ... ],
 *     "exampleOutputs": [ 4, ... ],        // the values the description claims
 *     "testInputs":    [ ["[-1,0,3,5,9,12]", "9"], ... ],
 *     "explanations":  { "example": ["..."], "test": ["..."] }   // optional
 *   }
 *
 * `exampleOutputs` is required and is the only guard against a *wrong* (rather
 * than crashing) reference: recording whatever the reference produces is
 * self-consistent by construction, so we also require the author to state, up
 * front, the outputs their description promises. If the reference disagrees
 * with the prose, one of the two is wrong and we refuse to write either.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { runPythonCode } from '../../../backend/utils/codeExecution.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const PROBLEM_DIR = path.join(REPO_ROOT, 'content/problems/algorithms');

const problemPath = (slug) => path.join(PROBLEM_DIR, `${slug}.json`);

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));

/**
 * Run `reference` against `inputs` and return the value it produced for each.
 *
 * The harness always compares against *something*, so we hand it a sentinel
 * that nothing can equal. We only read `actualOutput`; `passed` is meaningless
 * on this pass and is deliberately ignored.
 */
const computeOutputs = async (reference, inputRows) => {
    const probe = inputRows.map((inputs) => ({
        inputs,
        expectedOutput: '"__unset__"',
    }));

    const results = await runPythonCode(reference, probe);

    return results.map((result, index) => {
        if (result.error) {
            throw new Error(
                `reference failed on inputs ${JSON.stringify(inputRows[index])}: ${result.error}`,
            );
        }
        if (result.actualOutput === undefined) {
            throw new Error(
                `reference produced no value for inputs ${JSON.stringify(inputRows[index])}`,
            );
        }
        return result.actualOutput;
    });
};

/** Serialize a harness result into the on-disk `expectedOutput` string form. */
const encodeExpected = (value) => JSON.stringify(value);

const buildCases = (inputRows, outputs, explanations = [], { hidden = false } = {}) =>
    inputRows.map((inputs, index) => {
        const testCase = {
            inputs,
            expectedOutput: encodeExpected(outputs[index]),
            explanation: explanations[index] ?? '',
        };
        if (hidden) testCase.isHidden = false;
        return testCase;
    });

/** Re-grade the reference against the recorded values. This is the gate. */
const verify = async (reference, cases, label) => {
    const results = await runPythonCode(reference, cases);
    const failures = results
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => !result.passed);

    if (failures.length > 0) {
        const detail = failures
            .map(({ result, index }) =>
                `  ${label}[${index}] inputs=${JSON.stringify(cases[index].inputs)} ` +
                `expected=${cases[index].expectedOutput} got=${JSON.stringify(result.actualOutput)}` +
                (result.error ? ` error=${result.error}` : ''),
            )
            .join('\n');
        throw new Error(`reference did not reproduce its own ${label} outputs:\n${detail}`);
    }
};

const assertDraft = (draft, file) => {
    const missing = ['slug', 'description', 'reference', 'templates', 'exampleInputs', 'exampleOutputs', 'testInputs']
        .filter((field) => !draft[field]);
    if (missing.length > 0) {
        throw new Error(`${file}: missing required field(s): ${missing.join(', ')}`);
    }
    if (!draft.templates.python || !draft.templates.javascript) {
        throw new Error(`${file}: templates must include both python and javascript`);
    }
    if (draft.templates.python.trim() === draft.reference.trim()) {
        throw new Error(`${file}: the python template is the reference solution — it must be a stub`);
    }
    if (draft.exampleInputs.length === 0 || draft.testInputs.length === 0) {
        throw new Error(`${file}: needs at least one example input and one test input`);
    }
    if (draft.exampleOutputs.length !== draft.exampleInputs.length) {
        throw new Error(
            `${file}: exampleOutputs has ${draft.exampleOutputs.length} entries but ` +
            `exampleInputs has ${draft.exampleInputs.length}`,
        );
    }
};

/**
 * Cross-check the reference against the outputs the author's description
 * promises. Compared as JSON text so 4 and "4" are not quietly conflated.
 */
const assertMatchesClaims = (computed, claimed, file) => {
    const mismatches = computed
        .map((value, index) => ({ value, index }))
        .filter(({ value, index }) => JSON.stringify(value) !== JSON.stringify(claimed[index]));

    if (mismatches.length > 0) {
        const detail = mismatches
            .map(({ value, index }) =>
                `  example[${index}]: description says ${JSON.stringify(claimed[index])}, ` +
                `reference produced ${JSON.stringify(value)}`)
            .join('\n');
        throw new Error(`${file}: reference disagrees with the description:\n${detail}`);
    }
};

const applyDraft = async (file) => {
    const draft = await readJson(path.resolve(file));
    assertDraft(draft, file);

    const target = problemPath(draft.slug);
    const problem = await readJson(target);

    const exampleOutputs = await computeOutputs(draft.reference, draft.exampleInputs);
    assertMatchesClaims(exampleOutputs, draft.exampleOutputs, file);
    const testOutputs = await computeOutputs(draft.reference, draft.testInputs);

    const exampleTestCases = buildCases(
        draft.exampleInputs,
        exampleOutputs,
        draft.explanations?.example,
    );
    const testCases = buildCases(
        draft.testInputs,
        testOutputs,
        draft.explanations?.test,
        { hidden: true },
    );

    await verify(draft.reference, exampleTestCases, 'example');
    await verify(draft.reference, testCases, 'test');

    const updated = {
        ...problem,
        description: draft.description,
        templates: { ...problem.templates, ...draft.templates },
        exampleTestCases,
        testCases,
    };

    await writeFile(target, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    return { slug: draft.slug, examples: exampleTestCases.length, tests: testCases.length };
};

/**
 * Verify an already-written problem is internally consistent: every case has a
 * non-empty expected value and the templates are present. This cannot re-run
 * the reference (we do not store it), so it is a structural check only.
 */
const checkProblem = async (slug) => {
    const problem = await readJson(problemPath(slug));
    const problems = [];

    if (!problem.description?.trim()) problems.push('empty description');
    if (!problem.templates?.python?.trim()) problems.push('empty python template');
    if (!problem.templates?.javascript?.trim()) problems.push('empty javascript template');
    if (!problem.exampleTestCases?.length) problems.push('no example test cases');
    if (!problem.testCases?.length) problems.push('no test cases');

    for (const [index, testCase] of (problem.testCases ?? []).entries()) {
        if (!testCase.inputs?.length) problems.push(`testCases[${index}] has no inputs`);
        if (testCase.expectedOutput === undefined || testCase.expectedOutput === '') {
            problems.push(`testCases[${index}] has no expectedOutput`);
        }
    }

    if (problems.length > 0) {
        throw new Error(`${slug}: ${problems.join('; ')}`);
    }
    return { slug, examples: problem.exampleTestCases.length, tests: problem.testCases.length };
};

const main = async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('usage: solve.mjs <draft.json>... | --check <slug>...');
        process.exit(2);
    }

    const checkOnly = args[0] === '--check';
    const targets = checkOnly ? args.slice(1) : args;
    const failures = [];

    for (const target of targets) {
        try {
            const summary = checkOnly ? await checkProblem(target) : await applyDraft(target);
            console.log(`ok  ${summary.slug}  ${summary.examples} examples, ${summary.tests} tests`);
        } catch (error) {
            failures.push(error.message);
            console.error(`FAIL ${target}\n${error.message}`);
        }
    }

    if (failures.length > 0) {
        console.error(`\n${failures.length} of ${targets.length} failed`);
        process.exit(1);
    }
    console.log(`\n${targets.length} problem(s) validated`);
};

await main();
