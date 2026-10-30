import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import {
  createSlugger, extractHeadings, hastText, mermaidCode, plainHeadingText, rehypeReaderEnhancements, slugify,
} from '../src/components/systemDesign/markdown.js';
import {
  COMPLETED_KEY, createCompletionStore, loadCompleted, saveCompleted, toggleCompleted,
} from '../src/components/systemDesign/progress.js';
import {
  HANDBOOK_SLUG, curriculumStats, findTopic, isLesson, kindLabel, lessonNeighbours, lessonPath, progressOf,
} from '../src/components/systemDesign/curriculum.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

const brokenStorage = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
};

const LESSON = `Intro paragraph.

## Requirements

Text with a [jump](#deep-dives).

## High-Level Design

\`\`\`mermaid
flowchart LR
  A[Client] --> B[API]
\`\`\`

\`\`\`js
// ## not a heading
const x = 1;
\`\`\`

## Deep Dives

### Scaling \`reads\`

## Deep Dives

| a | b |
|---|---|
| 1 | 2 |
`;

function render(markdown, components) {
  return renderToStaticMarkup(createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSanitize, rehypeReaderEnhancements],
    components,
  }, markdown));
}

test('slugs are stable, readable and de-duplicated in order', () => {
  assert.equal(slugify('Deep Dives'), 'deep-dives');
  assert.equal(slugify('  Read/Write   Path (v2)! '), 'readwrite-path-v2');
  assert.equal(slugify('***'), 'section');
  const slug = createSlugger();
  assert.deepEqual(['A', 'A', 'a', 'B'].map(slug), ['a', 'a-1', 'a-2', 'b']);
  assert.equal(plainHeadingText('Scaling `reads` with **[Redis](https://x)** _now_'), 'Scaling reads with Redis now');
});

test('table of contents comes from ATX headings outside code fences and matches rendered ids', () => {
  const h2 = extractHeadings(LESSON, { minDepth: 2, maxDepth: 2 });
  assert.deepEqual(h2.map((h) => h.id), ['requirements', 'high-level-design', 'deep-dives', 'deep-dives-1']);
  const all = extractHeadings(LESSON, { minDepth: 2, maxDepth: 3 });
  assert.deepEqual(all.find((h) => h.depth === 3), { depth: 3, text: 'Scaling reads', id: 'scaling-reads' });

  const html = render(LESSON);
  for (const { id } of all) assert.match(html, new RegExp(`id="${id}"`));
  assert.doesNotMatch(html, /user-content-/, 'heading ids must not be clobbered by sanitize');
  assert.match(html, /href="#deep-dives"/);
});

test('sanitize keeps the mermaid language class and the plugin labels diagrams from the preceding heading', () => {
  const html = render(LESSON);
  assert.match(html, /<code class="language-mermaid" data-diagram-label="High-Level Design">/);

  const seen = [];
  render(LESSON, {
    pre: ({ node }) => {
      const code = mermaidCode(node);
      if (code) seen.push({ source: hastText(code), label: code.properties.dataDiagramLabel });
      return null;
    },
  });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].label, 'High-Level Design');
  assert.match(seen[0].source, /^flowchart LR\n {2}A\[Client\] --> B\[API\]/);

  const unlabelled = [];
  render('```mermaid\ngraph TD; A-->B\n```', {
    pre: ({ node }) => { unlabelled.push(mermaidCode(node)?.properties.dataDiagramLabel); return null; },
  });
  assert.deepEqual(unlabelled, ['Diagram']);
  assert.equal(mermaidCode({ type: 'element', tagName: 'pre', children: [{ type: 'element', tagName: 'code', properties: { className: ['language-js'] }, children: [] }] }), null);
});

test('raw HTML and script in Markdown stay inert', () => {
  const html = render('## Hi\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">');
  assert.doesNotMatch(html, /<script|onerror/);
});

test('completion storage is versioned and survives corrupt data and blocked storage', () => {
  assert.equal(COMPLETED_KEY, 'prepalgo.sd.completed.v1');
  assert.deepEqual(loadCompleted(memoryStorage({ [COMPLETED_KEY]: '{not json' })), []);
  assert.deepEqual(loadCompleted(memoryStorage({ [COMPLETED_KEY]: '{"a":1}' })), []);
  assert.deepEqual(loadCompleted(memoryStorage({ [COMPLETED_KEY]: '["a", 3, null, "a", "", "b"]' })), ['a', 'b']);
  assert.deepEqual(loadCompleted(null), []);
  assert.deepEqual(loadCompleted(brokenStorage), []);
  assert.equal(saveCompleted(brokenStorage, ['a']), false);
  assert.equal(saveCompleted(null, ['a']), false);
  assert.deepEqual(toggleCompleted(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggleCompleted(['a', 'b'], 'a'), ['b']);
});

test('completion store persists toggles, notifies subscribers and works without storage', () => {
  const storage = memoryStorage();
  const store = createCompletionStore(() => storage);
  let calls = 0;
  const unsubscribe = store.subscribe(() => { calls += 1; });
  const before = store.getSnapshot();
  assert.equal(store.getSnapshot(), before, 'snapshot must be referentially stable between changes');
  store.toggle('caching');
  assert.ok(store.getSnapshot().has('caching'));
  assert.equal(storage.values.get(COMPLETED_KEY), '["caching"]');
  store.toggle('caching');
  assert.equal(store.getSnapshot().size, 0);
  assert.equal(calls, 2);
  unsubscribe();

  storage.setItem(COMPLETED_KEY, '["x"]');
  store.reload();
  assert.ok(store.getSnapshot().has('x'));

  const privateMode = createCompletionStore(() => brokenStorage);
  privateMode.toggle('caching');
  assert.ok(privateMode.getSnapshot().has('caching'), 'in-memory progress still works when storage is blocked');
});

const modules = [
  { slug: 'sd-foundations', topics: [
    { slug: 'scaling', kind: 'concept', module: 'sd-foundations' },
    { slug: 'caching', kind: 'concept', module: 'sd-foundations' },
  ] },
  { slug: 'sd-patterns', topics: [{ slug: 'fan-out', kind: 'concept', module: 'sd-patterns' }] },
  { slug: 'sd-case-studies', topics: [{ slug: 'design-url-shortener', kind: 'case_study', module: 'sd-case-studies' }] },
  { slug: 'sd-handbook', topics: [{ slug: HANDBOOK_SLUG, kind: 'reference', module: 'sd-handbook' }] },
  { slug: 'sd-empty', topics: [] },
];

test('reference topics are outside the lesson path, counts and progress', () => {
  assert.deepEqual(lessonPath(modules).map((t) => t.slug), ['scaling', 'caching', 'fan-out', 'design-url-shortener']);
  assert.equal(isLesson(findTopic(modules, HANDBOOK_SLUG)), false);
  assert.equal(kindLabel(findTopic(modules, HANDBOOK_SLUG)), 'Reference');
  assert.equal(kindLabel({ kind: 'case_study' }), 'Design practice');

  const last = lessonNeighbours(modules, 'design-url-shortener');
  assert.equal(last.previous.slug, 'fan-out');
  assert.equal(last.next, null, 'the handbook is not the "next lesson"');
  assert.deepEqual(lessonNeighbours(modules, HANDBOOK_SLUG), { previous: null, next: null, isLesson: false });
  assert.equal(lessonNeighbours(modules, 'scaling').previous, null);

  const quizzes = new Map([['caching', {}], ['fan-out', {}], ['missing', {}]]);
  assert.deepEqual(curriculumStats(modules, quizzes), { lessons: 4, concepts: 2, patterns: 1, caseStudies: 1, checks: 2 });

  const done = new Set(['caching', HANDBOOK_SLUG, 'gone']);
  assert.deepEqual(progressOf(modules[0].topics, done), { done: 1, total: 2 });
  assert.deepEqual(progressOf(modules[3].topics, done), { done: 0, total: 0 });
  assert.deepEqual(progressOf(lessonPath(modules), done), { done: 1, total: 4 });
});
