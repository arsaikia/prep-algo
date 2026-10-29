import assert from 'node:assert/strict';
import { once } from 'node:events';
import { describe, it } from 'node:test';

import { createExecutorApp } from '../executor/server.js';
import { runCode } from '../utils/codeExecution.js';
import { entryFunction, gradingTypes } from '../utils/grading.js';
import { dockerArgs } from '../utils/sandbox/policy.js';

process.env.CODE_SANDBOX_MODE ||= 'subprocess';

const TYPES = { language: 'javascript', inputs: ['SCENARIO'], method: 'debounce' };
const SCENARIO = `const fn = spy();
const debounced = debounce(fn, 100);
debounced('a');
await clock.tick(50);
debounced('b');
await clock.tick(100);
return fn.calls;`;
const CASE = [{ inputs: [SCENARIO], expectedOutput: '[{"args":["b"],"at":150}]' }];
const CORRECT = `function debounce(func, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), wait);
  };
}`;

describe('JavaScript grading', () => {
    it('resolves the entry function from the JavaScript template', () => {
        assert.equal(entryFunction('// hi\nfunction promiseAll(iterable) {\n}'), 'promiseAll');
        const item = { templates: { python: '', javascript: 'function deepClone(value) {}' }, types: { language: 'javascript', inputs: ['SCENARIO'] } };
        assert.equal(gradingTypes(item).method, 'deepClone');
    });

    it('passes a correct solution on the virtual clock', async () => {
        const [result] = await runCode(CORRECT, CASE, TYPES);
        assert.equal(result.status, 'passed', result.error);
        assert.deepEqual(result.actualOutput, [{ args: ['b'], at: 150 }]);
    });

    it('judges a wrong answer on the server and keeps console output', async () => {
        const leading = `function debounce(func) { return (...args) => { console.log('called', args[0]); func(...args); }; }`;
        const [result] = await runCode(leading, CASE, TYPES);
        assert.equal(result.status, 'wrong');
        assert.match(result.debugOutput, /called a/);
    });

    it('accepts const and module.exports definitions', async () => {
        const asConst = CORRECT.replace('function debounce(func, wait) {', 'const debounce = (func, wait) => {').replace(/}$/, '};');
        const exported = CORRECT.replace('function debounce', 'function anything') + '\nmodule.exports = anything;';
        for (const code of [asConst, exported]) {
            const [result] = await runCode(code, CASE, TYPES);
            assert.equal(result.status, 'passed', result.error);
        }
    });

    it('reports a renamed function, a syntax error and a promise that never settles', async () => {
        const [renamed] = await runCode('function other() {}', CASE, TYPES);
        assert.match(renamed.error, /no function debounce/);
        const [syntax] = await runCode('function debounce( {', CASE, TYPES);
        assert.match(syntax.error, /SyntaxError/);
        const hang = [{ inputs: ['return await debounce();'], expectedOutput: 'null' }];
        const [never] = await runCode('function debounce() { return new Promise(() => {}); }', hang, TYPES);
        assert.match(never.error, /never settled/);
    });

    it('turns an infinite loop into Time Limit Exceeded and skips the rest', async () => {
        const results = await runCode('function debounce() { for (;;) {} }', [CASE[0], CASE[0]], TYPES);
        assert.deepEqual(results.map((r) => r.status), ['tle', 'skipped']);
    });

    it('gives solutions a browser-like realm without Node globals', async () => {
        const probe = [{ inputs: ['return debounce();'], expectedOutput: '["undefined","undefined",true]' }];
        const code = `function debounce() {
  return [typeof require, typeof process, Date.now() === 0 && new Date().constructor === Date];
}`;
        const [result] = await runCode(code, probe, TYPES);
        assert.equal(result.status, 'passed', result.error);
    });

    it('runs JavaScript in the stock Node image with the permission model', () => {
        const args = dockerArgs('javascript');
        assert.ok(args.includes('--network=none'));
        assert.ok(args.includes('node:22-alpine') || args.some((a) => a.startsWith('node@sha256:')));
        assert.ok(args.includes('--permission'));
        assert.equal(dockerArgs().at(-1), '-');
        assert.ok(dockerArgs().includes('python3'));
    });
});

describe('executor language protocol', () => {
    it('defaults to Python, refuses unknown languages and uninstalled runtimes', async () => {
        const seen = [];
        const app = createExecutorApp({
            verify: async () => {},
            languages: ['python'],
            run: async (source, timeoutMs, { language }) => {
                seen.push(language);
                return { stdout: '', stderr: '', exitCode: 0, timedOut: false, oom: false };
            },
        });
        const server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const send = (body) => fetch(`http://127.0.0.1:${server.address().port}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
            body: JSON.stringify({ source: 'x', timeoutMs: 100, ...body }),
        });
        try {
            assert.equal((await send({})).status, 200);
            assert.equal((await send({ language: 'ruby' })).status, 400);
            assert.equal((await send({ language: 'javascript' })).status, 503);
            assert.deepEqual(seen, ['python']);
        } finally {
            server.closeAllConnections();
            await new Promise((resolve) => server.close(resolve));
        }
    });
});
