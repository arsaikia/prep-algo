import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { contentItemSchema } from '../../content/schema.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC_OUT = path.join(ROOT, 'frontend/public/content');
const SERVER_OUT = path.join(ROOT, 'backend/content');

const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));

async function fingerprint(dir) {
    const out = [];
    const walk = async (d) => {
        for (const e of (await readdir(d, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
            const full = path.join(d, e.name);
            if (e.isDirectory()) await walk(full);
            else out.push(`${path.relative(ROOT, full)}:${createHash('sha256').update(await readFile(full)).digest('hex')}`);
        }
    };
    await walk(dir);
    return out.join('\n');
}

test('build output is reproducible', async () => {
    // Immutable caching is only safe if identical input yields identical
    // bytes. If this ever fails, every deploy silently invalidates every
    // client's cached content.
    const before = await fingerprint(PUBLIC_OUT);
    const { execFileSync } = await import('node:child_process');
    execFileSync('node', ['scripts/content/build.mjs'], { cwd: ROOT, stdio: 'ignore' });
    assert.equal(await fingerprint(PUBLIC_OUT), before);
});

test('published items never contain answer keys', async () => {
    // The entire point of server-side grading. A single leaked field here
    // makes every quiz and every hidden test case worthless.
    for (const f of await readdir(path.join(PUBLIC_OUT, 'items'))) {
        const raw = await readFile(path.join(PUBLIC_OUT, 'items', f), 'utf8');
        for (const forbidden of ['"isCorrect"', '"testCases"', '"isHidden"']) {
            assert.ok(!raw.includes(forbidden), `${f} leaks ${forbidden}`);
        }
    }
});

test('answer keys are present server-side', async () => {
    const answers = await readJson(path.join(SERVER_OUT, 'quiz-answers.json'));
    const tests = await readJson(path.join(SERVER_OUT, 'testcases.json'));

    assert.ok(Object.keys(answers).length > 0, 'no quiz answers exported');
    assert.ok(Object.keys(tests).length > 0, 'no hidden test cases exported');

    for (const [slug, options] of Object.entries(answers)) {
        assert.ok(
            options.some((o) => o.isCorrect),
            `${slug} has no correct option — it would be unanswerable`,
        );
    }
});

test('manifest resolves to an index which resolves to every item', async () => {
    const manifest = await readJson(path.join(PUBLIC_OUT, 'manifest.json'));
    const index = await readJson(path.join(PUBLIC_OUT, manifest.index));

    assert.equal(index.count, index.items.length);

    // Each entry carries its own body hash so the client can build the item
    // URL directly, without a lookup round-trip.
    for (const entry of index.items) {
        await readJson(path.join(PUBLIC_OUT, 'items', `${entry.slug}.${entry.h}.json`));
    }
});

test('hashes match their content', async () => {
    const manifest = await readJson(path.join(PUBLIC_OUT, 'manifest.json'));
    const expected = createHash('sha256')
        .update(await readFile(path.join(PUBLIC_OUT, manifest.index)))
        .digest('hex')
        .slice(0, 10);
    assert.ok(manifest.index.includes(expected), 'index filename hash does not match its bytes');
});

test('schema rejects structurally invalid content', async () => {
    assert.ok(!contentItemSchema.safeParse({ type: 'problem' }).success);
    assert.ok(
        !contentItemSchema.safeParse({
            type: 'quiz',
            slug: 'Not A Slug',
            title: 'x',
            domain: 'frontend',
            options: [{ id: 'a', text: 'a', isCorrect: true }],
        }).success,
        'non-kebab-case slug should be rejected',
    );
});
