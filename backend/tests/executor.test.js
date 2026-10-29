import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { GoogleAuth } from 'google-auth-library';
import { createExecutorApp } from '../executor/server.js';
import { executePython } from '../utils/sandbox/index.js';
import { remoteRunner } from '../utils/sandbox/remote.js';

test('isolated executor authenticates before parsing and bounds its protocol', async () => {
    let runs = 0;
    let available = true;
    const app = createExecutorApp({
        ready: async () => available,
        verify: async token => { if (token !== 'test-identity') throw new Error('Rejected'); },
        run: async source => {
            runs++;
            return { stdout: source, stderr: '', exitCode: 0, timedOut: false, oom: false };
        },
    });
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}/execute`;
    const send = (body, token) => fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
    });
    try {
        assert.equal((await fetch(new URL('/health/ready', url))).status, 200);
        available = false;
        assert.equal((await fetch(new URL('/health/ready', url))).status, 503);
        assert.equal((await send({ source: 'hello', timeoutMs: 100 })).status, 401);
        assert.equal((await send({ source: 'hello', timeoutMs: 100 }, 'wrong')).status, 403);
        assert.equal((await send({ source: 'hello', timeoutMs: 6000 }, 'test-identity')).status, 400);
        assert.equal(runs, 0);
        const result = await send({ source: 'hello', timeoutMs: 100 }, 'test-identity');
        assert.equal(result.status, 200);
        assert.equal((await result.json()).stdout, 'hello');
        assert.equal(runs, 1);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});

test('production cannot silently execute in the credentialed API container', async () => {
    const previous = process.env.NODE_ENV;
    const endpoint = process.env.CODE_EXECUTOR_URL;
    process.env.NODE_ENV = 'production';
    delete process.env.CODE_EXECUTOR_URL;
    try {
        await assert.rejects(executePython({ source: 'print(1)' }), error => error.statusCode === 503);
    } finally {
        if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
        if (endpoint !== undefined) process.env.CODE_EXECUTOR_URL = endpoint;
    }
});

test('remote transport allows a program timeout to return instead of misclassifying it as infrastructure failure', async t => {
    const endpoint = process.env.CODE_EXECUTOR_URL;
    process.env.CODE_EXECUTOR_URL = 'https://executor.test';
    t.mock.method(GoogleAuth.prototype, 'getIdTokenClient', async () => ({
        getRequestHeaders: async () => ({ authorization: 'test-identity' }),
    }));
    t.mock.method(globalThis, 'fetch', async (url, { signal }) => {
        await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 25);
            signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
        });
        return Response.json({ stdout: '', stderr: '', exitCode: null, timedOut: true, oom: false });
    });
    try {
        const result = await remoteRunner('source', 5);
        assert.equal(result.timedOut, true);
        assert.equal(result.runner, 'remote-docker');
    } finally {
        if (endpoint === undefined) delete process.env.CODE_EXECUTOR_URL; else process.env.CODE_EXECUTOR_URL = endpoint;
    }
});
