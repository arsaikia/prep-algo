/**
 * Record expected outputs for new or existing test cases from the accepted
 * solutions in scripts/content/solutions/<slug>.py (or .js).
 *
 * Expected values are never typed by hand. Every accepted solution is run on
 * each case and must agree (under the problem's compare mode) before anything
 * is written, so one buggy reference cannot silently become the answer key.
 *
 * Usage:
 *   record-cases.mjs <slug> --add '[["[1,2,3]","4"], ["gen:Rng(1).ints(100000,-10**9,10**9)","7"]]'
 *       [--example] [--explanation TEXT]       append hidden (or example) cases
 *   record-cases.mjs <slug> --rerecord tests:0,3 | examples:1 | tests:all
 *                                              recompute recorded outputs
 *   --single     allow a single accepted solution to define the answer
 *   --dry-run    print what would change without writing
 *
 * Use `gen:` inputs (hidden cases only) for anything large: the expression is
 * evaluated in the sandbox with `Rng(seed)` (randint, choice, shuffle,
 * ints(n, lo, hi), word(n, alphabet)) and Python builtins.
 */

import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { parseArgs } from 'node:util';

import { findProblem, loadSolutions, preview, saveProblem } from './solutions-lib.mjs';

const { values: options, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        add: { type: 'string' },
        rerecord: { type: 'string' },
        example: { type: 'boolean', default: false },
        explanation: { type: 'string', default: '' },
        single: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        mode: { type: 'string', default: 'subprocess' },
    },
});

process.env.CODE_SANDBOX_MODE = options.mode;
process.env.LOG_LEVEL ||= 'error';
const { runCode } = await import('../../../backend/utils/codeExecution.js');
const { judge, digestOf, gradingTypes } = await import('../../../backend/utils/grading.js');

const MAX_LITERAL_INPUT = 40_000;
const MAX_EXPECTED = 50_000;

const fail = (message) => {
    console.error(message);
    process.exit(1);
};

const [slug] = positionals;
if (!slug || (!options.add && !options.rerecord)) fail('usage: record-cases.mjs <slug> --add CASES | --rerecord tests:0,1');

const { file, item } = await findProblem(slug);
const solutions = (await loadSolutions(slug, item.types?.language))?.filter((s) => s.expect === 'accept') ?? [];
if (solutions.length === 0) fail(`${slug}: no accepted solutions in scripts/content/solutions/${slug}.${item.types?.language === 'javascript' ? 'js' : 'py'}`);
if (solutions.length < 2 && !options.single) fail(`${slug}: need two accepted solutions to cross-check (or pass --single)`);
const types = gradingTypes(item);

const record = async (inputs) => {
    for (const input of inputs) {
        if (!input.startsWith('gen:') && input.length > MAX_LITERAL_INPUT) {
            fail(`literal input of ${input.length} chars is too large; use a gen: expression`);
        }
        if (input.startsWith('gen:') && types?.checker) fail('checker problems cannot use gen: inputs');
    }
    let reference = null;
    for (const solution of solutions) {
        const [result] = await runCode(solution.code, [{ inputs, expectedOutput: 'null' }], types);
        if (result.status !== 'passed' && result.status !== 'wrong') {
            fail(`${solution.name} failed on ${preview(inputs)}: ${result.status} ${result.error ?? ''}`);
        }
        // Large answers come back as a digest; store that instead of the value.
        const text = result.digest ?? JSON.stringify(result.actualOutput);
        if (!reference) {
            reference = { name: solution.name, text };
        } else if (!judge(result.actualOutput, reference.text, types, inputs, result.digest ?? null)) {
            fail(`solutions disagree on ${preview(inputs)}:\n  ${reference.name}: ${preview(reference.text)}\n  ${solution.name}: ${preview(text)}`);
        }
    }
    if (reference.text.length > MAX_EXPECTED) {
        const value = JSON.parse(reference.text);
        if (types?.checker || /\d\.\d|e[-+]?\d/i.test(reference.text)) fail(`expected output is ${reference.text.length} chars; choose a case with a smaller answer`);
        reference.text = digestOf(value, types?.compare ?? 'exact');
    }
    return reference.text;
};

const changes = [];

if (options.add) {
    const raw = options.add.startsWith('@') ? await readFile(options.add.slice(1), 'utf8') : options.add;
    const cases = JSON.parse(raw);
    if (!Array.isArray(cases) || !cases.every((c) => Array.isArray(c) && c.every((i) => typeof i === 'string'))) {
        fail('--add expects a JSON array of input arrays, each input a string');
    }
    const target = options.example ? 'exampleTestCases' : 'testCases';
    item[target] ??= [];
    for (const inputs of cases) {
        if (options.example && inputs.some((i) => i.startsWith('gen:'))) fail('gen: inputs are only allowed in hidden cases');
        const expectedOutput = await record(inputs);
        const entry = { inputs, expectedOutput, explanation: options.explanation };
        if (!options.example) entry.isHidden = true;
        item[target].push(entry);
        changes.push(`+ ${target}[${item[target].length - 1}] ${preview(inputs)} -> ${preview(expectedOutput)}`);
    }
}

if (options.rerecord) {
    for (const spec of options.rerecord.split(/\s+/)) {
        const [kind, list] = spec.split(':');
        const target = kind === 'examples' ? 'exampleTestCases' : kind === 'tests' ? 'testCases' : fail(`unknown case list ${kind}`);
        const cases = item[target] ?? [];
        const indices = list === 'all' ? cases.map((_, i) => i) : list.split(',').map(Number);
        for (const index of indices) {
            const testCase = cases[index] ?? fail(`${target}[${index}] does not exist`);
            const expectedOutput = await record(testCase.inputs);
            if (expectedOutput !== testCase.expectedOutput) {
                changes.push(`~ ${target}[${index}] ${preview(testCase.inputs)}: ${preview(testCase.expectedOutput)} -> ${preview(expectedOutput)}`);
                testCase.expectedOutput = expectedOutput;
            }
        }
    }
}

for (const change of changes) console.log(change);
if (!changes.length) console.log('no changes');
if (changes.length && !options['dry-run']) {
    await saveProblem(file, item);
    console.log(`wrote ${file}`);
}
