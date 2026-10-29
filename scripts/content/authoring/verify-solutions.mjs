/**
 * Grade every solution in scripts/content/solutions/<slug>.py (or .js) through the real
 * harness and check each one gets the verdict its marker promises.
 *
 * Usage:
 *   node scripts/content/authoring/verify-solutions.mjs [slug ...] [options]
 *
 *   --mode subprocess|docker  sandbox runner (docker matches production:
 *                             python:3.11-alpine, 0.5 CPU). Default: subprocess.
 *   --shard i/n               verify only every n-th problem, offset i
 *   --json FILE               also write the full report as JSON
 *   --missing                 list problems that have no solutions file
 *
 * An accepted solution must also finish every case within ACCEPT_BUDGET_MS, so
 * the verdict holds on slower production hardware rather than just locally.
 */

import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import { parseArgs } from 'node:util';

import { listProblems, loadSolutions, preview } from './solutions-lib.mjs';

const { values: options, positionals: slugs } = parseArgs({
    allowPositionals: true,
    options: {
        mode: { type: 'string', default: 'subprocess' },
        shard: { type: 'string' },
        json: { type: 'string' },
        missing: { type: 'boolean', default: false },
    },
});

process.env.CODE_SANDBOX_MODE = options.mode;
process.env.LOG_LEVEL ||= 'error';
const { runCode } = await import('../../../backend/utils/codeExecution.js');
const { POLICY } = await import('../../../backend/utils/sandbox/index.js');
const { gradingTypes } = await import('../../../backend/utils/grading.js');

const ACCEPT_BUDGET_MS = Math.round(POLICY.timeoutMs * (options.mode === 'docker' ? 0.5 : 0.3));
const FAILING = new Set(['wrong', 'error', 'mle']);

const summarize = (results) => {
    const counts = {};
    for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(' ');
};

const firstFailure = (results, cases, label, statuses) => {
    const index = results.findIndex((r) => statuses.has(r.status));
    if (index === -1) return null;
    const r = results[index];
    return `${label} #${index + 1} ${r.status}: input=${preview(cases[index].inputs)} expected=${preview(cases[index].expectedOutput)} actual=${preview(r.actualOutput)}${r.error ? ` error=${preview(r.error, 300)}` : ''}`;
};

const verdictFor = (solution, examples, tests, exampleCases, testCases) => {
    const all = [...examples, ...tests];
    const maxMs = Math.max(0, ...all.map((r) => r.runtimeMs ?? 0));
    const problems = [];
    if (solution.expect === 'accept') {
        const bad = firstFailure(examples, exampleCases, 'example', new Set(['wrong', 'error', 'mle', 'tle', 'skipped']))
            ?? firstFailure(tests, testCases, 'test', new Set(['wrong', 'error', 'mle', 'tle', 'skipped']));
        if (bad) problems.push(bad);
        else if (maxMs > ACCEPT_BUDGET_MS) {
            const slowest = all.reduce((a, b) => ((b.runtimeMs ?? 0) > (a.runtimeMs ?? 0) ? b : a));
            problems.push(`too slow for a safe accept: ${maxMs}ms > ${ACCEPT_BUDGET_MS}ms (input ${preview(slowest.input)})`);
        }
    } else if (solution.expect === 'tle') {
        const bad = firstFailure(examples, exampleCases, 'example', new Set(['wrong', 'error', 'mle', 'tle', 'skipped']))
            ?? firstFailure(tests, testCases, 'test', FAILING);
        if (bad) problems.push(bad);
        else if (!tests.some((r) => r.status === 'tle')) problems.push(`never hit the time limit (slowest case ${maxMs}ms)`);
    } else if (!all.some((r) => FAILING.has(r.status))) {
        problems.push(`was not rejected (${summarize(all)})`);
    }
    return { ok: problems.length === 0, maxMs, detail: problems.join('; ') };
};

const all = await listProblems();
let problems = slugs.length ? all.filter((p) => slugs.includes(p.slug)) : all;
const unknown = slugs.filter((s) => !all.some((p) => p.slug === s));
if (unknown.length) {
    console.error(`Unknown slug(s): ${unknown.join(', ')}`);
    process.exit(2);
}
if (options.shard) {
    const [i, n] = options.shard.split('/').map(Number);
    problems = problems.filter((_, index) => index % n === i);
}

const report = [];
const missing = [];
let failures = 0;

for (const { slug, item } of problems) {
    const solutions = await loadSolutions(slug, item.types?.language);
    if (!solutions) {
        missing.push(slug);
        continue;
    }
    const exampleCases = item.exampleTestCases ?? [];
    const testCases = item.testCases ?? [];
    const notes = [];
    if (solutions.filter((s) => s.expect === 'accept').length < 2) notes.push('fewer than two accepted solutions');
    if (!testCases.length) notes.push('no hidden test cases');

    for (const solution of solutions) {
        const examples = exampleCases.length ? await runCode(solution.code, exampleCases, gradingTypes(item)) : [];
        const tests = testCases.length ? await runCode(solution.code, testCases, gradingTypes(item)) : [];
        const verdict = verdictFor(solution, examples, tests, exampleCases, testCases);
        if (!verdict.ok) failures += 1;
        report.push({
            slug,
            solution: solution.name,
            expect: solution.expect,
            ok: verdict.ok,
            maxMs: verdict.maxMs,
            statuses: summarize([...examples, ...tests]),
            detail: verdict.detail,
        });
        console.log(`${verdict.ok ? 'PASS' : 'FAIL'} ${slug} ${solution.name} [${solution.expect}] ${summarize([...examples, ...tests])} max=${verdict.maxMs}ms${verdict.detail ? `\n     ${verdict.detail}` : ''}`);
    }
    for (const note of notes) console.log(`NOTE ${slug}: ${note}`);
}

if (options.missing && missing.length) console.log(`MISSING ${missing.length}: ${missing.join(' ')}`);
if (options.json) await writeFile(options.json, `${JSON.stringify({ mode: options.mode, report, missing }, null, 2)}\n`);
console.log(`\n${report.length - failures}/${report.length} solutions behaved as declared${missing.length ? `; ${missing.length} problem(s) without solutions` : ''}`);
process.exit(failures ? 1 : 0);
