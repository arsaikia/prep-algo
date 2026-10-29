import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hostingConfig, restoreRelease } from './prepare.mjs';

test('hosting rewrites only navigation and grants immutable caching only to existing artifacts', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'prepalgo-hosting-'));
    try {
        await mkdir(path.join(dir, 'assets'));
        await mkdir(path.join(dir, 'content/items'), { recursive: true });
        await writeFile(path.join(dir, 'assets/app-abc.js'), 'test');
        await writeFile(path.join(dir, 'content/items/example.0123456789.json'), '{}');
        const { hosting } = await hostingConfig(dir);
        const routes = new RegExp(hosting.rewrites[0].regex);
        for (const route of ['/', '/all', '/login', '/codesandbox', '/system-design/caching']) assert.ok(routes.test(route));
        for (const missing of ['/api/v1/questions', '/assets/missing.js', '/content/items/missing.0123456789.json']) {
            assert.equal(routes.test(missing), false);
            assert.equal(hosting.headers.some(rule => rule.source === missing), false);
        }
        assert.ok(hosting.headers.some(rule => rule.source === '/assets/app-abc.js' &&
            rule.headers[0].value.includes('immutable')));
        assert.equal(hosting.headers[0].headers[0].value, 'no-cache');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('release restoration retains previous hashes, skips valid local files and rejects corruption', async t => {
    const dir = await mkdtemp(path.join(tmpdir(), 'prepalgo-retention-'));
    const checksum = value => createHash('sha256').update(value).digest('hex');
    const oldChunk = '/assets/old-abc.js';
    const oldContent = '/content/items/example.0123456789.json';
    const files = [
        { path: oldChunk, sha256: checksum('old chunk') },
        { path: oldContent, sha256: checksum('{"old":true}') },
    ];
    let corrupt = false;
    const requests = [];
    t.mock.method(globalThis, 'fetch', async url => {
        requests.push(url.pathname);
        if (url.pathname === '/release-assets.json') return Response.json({ version: 1, files });
        return new Response(corrupt ? 'wrong contents' : '{"old":true}');
    });
    try {
        await mkdir(path.join(dir, 'assets'));
        await writeFile(path.join(dir, oldChunk), 'old chunk');
        await restoreRelease('https://prepalgo.web.app', dir);
        assert.deepEqual(requests, ['/release-assets.json', oldContent]);
        assert.equal(await readFile(path.join(dir, oldContent), 'utf8'), '{"old":true}');
        assert.equal(await readFile(path.join(dir, oldChunk), 'utf8'), 'old chunk');
        await rm(path.join(dir, oldContent));
        corrupt = true;
        await assert.rejects(restoreRelease('https://prepalgo.web.app', dir), /checksum mismatch/);
        files[0].path = '/assets/../escape.js';
        await assert.rejects(restoreRelease('https://prepalgo.web.app', dir), /Invalid retained artifact/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
