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

test('server catalog mirrors the public items and never carries answer keys', async () => {
    // The backend serves question metadata from this file — API responses,
    // recommendations — so it must hold exactly what the CDN already
    // publishes. Anything more would leak answers through JSON responses.
    const raw = await readFile(path.join(SERVER_OUT, 'catalog.json'), 'utf8');
    for (const forbidden of ['"isCorrect"', '"testCases"', '"isHidden"']) {
        assert.ok(!raw.includes(forbidden), `catalog leaks ${forbidden}`);
    }

    const catalog = JSON.parse(raw);
    const manifest = await readJson(path.join(PUBLIC_OUT, 'manifest.json'));
    const index = await readJson(path.join(PUBLIC_OUT, manifest.index));
    assert.equal(catalog.count, catalog.items.length);
    assert.deepEqual(
        catalog.items.map((i) => i.slug),
        index.items.map((i) => i.slug),
        'catalog order must match the index so both sides agree on list order',
    );

    const byLegacyId = new Set();
    for (const item of catalog.items) {
        assert.equal(typeof item.availableForSolve, 'boolean', `${item.slug}: availableForSolve`);
        // Example explanations are public; per-option explanations reveal
        // the answer, so quiz options may carry nothing beyond id and text.
        for (const option of item.options ?? []) {
            assert.deepEqual(Object.keys(option).sort(), ['id', 'text'], `${item.slug}: option leaks`);
        }
        if (item.legacyId) {
            assert.ok(!byLegacyId.has(item.legacyId), `${item.slug}: duplicate legacyId`);
            byLegacyId.add(item.legacyId);
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

test('index carries every field the question list renders', async () => {
    const manifest = await readJson(path.join(PUBLIC_OUT, 'manifest.json'));
    const index = await readJson(path.join(PUBLIC_OUT, manifest.index));

    // The list UI is fed entirely from the index. A field missing here is not
    // a build failure and not a runtime error — it silently renders a degraded
    // page, which is how `availableForSolve` once hid every Solve button.
    for (const entry of index.items) {
        assert.equal(typeof entry.title, 'string', `${entry.slug}: title`);
        assert.equal(typeof entry.group, 'string', `${entry.slug}: group`);
        assert.equal(
            typeof entry.availableForSolve,
            'boolean',
            `${entry.slug}: availableForSolve must be present or the Solve button disappears`,
        );

        // Progress is joined on legacyId, so a solvable entry without one can
        // never be marked solved. Content authored after the Mongo export has
        // no row to carry an ObjectId from, and modules and topics are read
        // rather than solved — neither participates in the progress join, so
        // requiring an id there would only force a fake one.
        const joinsProgress = entry.type === 'problem' || entry.type === 'quiz';
        if (joinsProgress) {
            assert.equal(typeof entry.legacyId, 'string', `${entry.slug}: legacyId`);
        } else {
            assert.ok(
                entry.legacyId === undefined || typeof entry.legacyId === 'string',
                `${entry.slug}: legacyId must be a string when present`,
            );
        }

        // `link` is the routing key. It is only stored when it differs from the
        // slug, so the fallback has to stay valid.
        assert.ok((entry.link || entry.slug).length > 0, `${entry.slug}: no routable link`);
    }

    // Guard the whole point of the exercise: the index must stay small enough
    // to be a cheap first paint.
    const bytes = (await readFile(path.join(PUBLIC_OUT, manifest.index))).length;
    assert.ok(bytes < 400_000, `index is ${bytes} bytes uncompressed — budget exceeded`);
});
