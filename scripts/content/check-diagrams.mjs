#!/usr/bin/env node
/**
 * Parses every ```mermaid block in authored topics with the same Mermaid
 * version the frontend renders, so a broken diagram fails before release.
 *
 *   node scripts/content/check-diagrams.mjs [slug ...]
 */
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOPICS = join(ROOT, 'content', 'topics');
const BLOCK = /```mermaid\n([\s\S]*?)```/g;

let mermaidPromise;
async function loadMermaid() {
    if (!mermaidPromise) {
        const { window } = new JSDOM('');
        globalThis.window ??= window;
        globalThis.document ??= window.document;
        const require = createRequire(join(ROOT, 'frontend', 'package.json'));
        const entry = join(dirname(require.resolve('mermaid/package.json')), 'dist', 'mermaid.core.mjs');
        mermaidPromise = import(pathToFileURL(entry).href).then((m) => m.default);
    }
    return mermaidPromise;
}

export function extractDiagrams(markdown) {
    return [...markdown.matchAll(BLOCK)].map((m) => m[1]);
}

export async function checkDiagrams(slugs = []) {
    const mermaid = await loadMermaid();
    const files = (await readdir(TOPICS)).filter((f) => f.endsWith('.json'))
        .filter((f) => !slugs.length || slugs.includes(f.slice(0, -5)));
    const errors = [];
    let count = 0;
    for (const file of files) {
        const topic = JSON.parse(await readFile(join(TOPICS, file), 'utf8'));
        for (const [index, source] of extractDiagrams(topic.body).entries()) {
            count += 1;
            try {
                await mermaid.parse(source);
            } catch (error) {
                errors.push(`${topic.slug} diagram #${index + 1}: ${String(error.message).split('\n').slice(0, 3).join(' ')}`);
            }
        }
    }
    return { count, files: files.length, errors };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    const { count, files, errors } = await checkDiagrams(process.argv.slice(2));
    errors.forEach((e) => console.error(`✗ ${e}`));
    console.log(`${count} diagram(s) in ${files} topic(s); ${errors.length} error(s)`);
    process.exit(errors.length ? 1 : 0);
}
