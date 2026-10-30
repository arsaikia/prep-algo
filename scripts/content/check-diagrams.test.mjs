import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDiagrams, extractDiagrams } from './check-diagrams.mjs';

test('extracts mermaid fences only', () => {
    const md = '```mermaid\nflowchart LR\n  A --> B\n```\n```js\nx\n```';
    assert.deepEqual(extractDiagrams(md), ['flowchart LR\n  A --> B\n']);
});

test('every authored diagram parses', async () => {
    const { errors } = await checkDiagrams();
    assert.deepEqual(errors, []);
});
