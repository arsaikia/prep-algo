import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../content/', import.meta.url));
const readDir = (dir) =>
    readdirSync(join(root, dir))
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(join(root, dir, f), 'utf8')));

const topics = readDir('topics').filter((t) => t.domain === 'system_design');
const quizzes = readDir('quizzes/system_design');
const modules = new Map(readDir('modules').map((m) => [m.slug, m]));
const bySlug = new Map(topics.map((t) => [t.slug, t]));

test('every system design topic belongs to a known module', () => {
    for (const t of topics) assert.ok(modules.has(t.module), `${t.slug} -> ${t.module}`);
});

test('every case study has diagrams and a knowledge check', () => {
    const cases = topics.filter((t) => t.kind === 'case_study');
    assert.ok(cases.length >= 17, `expected >= 17 case studies, got ${cases.length}`);
    const quizTopics = new Set(quizzes.map((q) => q.topic));
    for (const t of cases) {
        assert.match(t.body, /```mermaid/, `${t.slug} has no diagram`);
        assert.ok(quizTopics.has(t.slug), `${t.slug} has no quiz`);
    }
});

test('handbook is a reference topic in the handbook module', () => {
    const h = bySlug.get('system-design-handbook');
    assert.equal(h?.kind, 'reference');
    assert.equal(h.module, 'sd-handbook');
});

test('prerequisites and internal links resolve', () => {
    for (const t of topics) {
        for (const p of t.prerequisites || []) assert.ok(bySlug.has(p), `${t.slug} prereq ${p}`);
        for (const [, s] of t.body.matchAll(/\/system-design\/([a-z0-9-]+)/g)) {
            assert.ok(bySlug.has(s), `${t.slug} links to missing ${s}`);
        }
    }
});

test('topic order is unique within each module', () => {
    const seen = new Set();
    for (const t of topics) {
        const key = `${t.module}:${t.order}`;
        assert.ok(!seen.has(key), `duplicate order ${key}`);
        seen.add(key);
    }
});
