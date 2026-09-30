import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  listItems,
  getItemBySlug,
  getItemByLegacyId,
  answerFormatFor,
  toQuestionSummary,
  gradeQuiz,
  getGradingSpec,
  resetContentCache
} from '../utils/contentStore.js';

const PROBLEM = {
  type: 'problem',
  slug: 'two-sum',
  link: 'two-sum/',
  legacyId: 'legacy-problem',
  title: 'Two Sum',
  domain: 'algorithms',
  group: 'Arrays & Hashing',
  difficulty: 'Easy',
  description: 'Find two numbers that add up to target.',
  exampleTestCases: [{ input: 'nums = [2,7]', output: '[0,1]', explanation: '2 + 7 = 9' }],
  templates: { python: 'class Solution: pass' },
  availableForSolve: true
};

const QUIZ = {
  type: 'quiz',
  slug: 'cache-eviction-quiz',
  legacyId: 'legacy-quiz',
  title: 'Cache eviction',
  domain: 'system_design',
  group: 'Caching',
  difficulty: 'Medium',
  topic: 'caching',
  options: [{ id: 'a', text: 'LRU' }, { id: 'b', text: 'FIFO' }],
  availableForSolve: true
};

const CASE_STUDY = {
  type: 'topic',
  slug: 'design-url-shortener',
  legacyId: 'legacy-topic',
  title: 'Design a URL shortener',
  domain: 'system_design',
  group: 'Case Studies',
  body: '## Requirements',
  availableForSolve: false
};

const CONCEPT = {
  type: 'topic',
  slug: 'caching',
  title: 'Caching',
  domain: 'system_design',
  group: 'Foundations',
  module: 'sd-foundations',
  availableForSolve: false
};

const MODULE = {
  type: 'module',
  slug: 'sd-foundations',
  title: 'Foundations',
  domain: 'system_design',
  group: 'Curriculum',
  availableForSolve: false
};

const ITEMS = [PROBLEM, QUIZ, CASE_STUDY, CONCEPT, MODULE];

const QUIZ_ANSWERS = {
  'cache-eviction-quiz': [
    { id: 'a', isCorrect: true, explanation: 'Evicts the least recently used entry.' },
    { id: 'b', isCorrect: false, explanation: 'Ignores access recency.' }
  ]
};

const writeCatalog = (dir, items) =>
  writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify({ version: 1, count: items.length, items }));

// Points the store at a fixture directory for the duration of a suite, so
// tests never read or overwrite the real build output.
const useBundleDir = (dir) => {
  const previous = process.env.CONTENT_BUNDLE_DIR;
  process.env.CONTENT_BUNDLE_DIR = dir;
  resetContentCache();
  return () => {
    if (previous === undefined) delete process.env.CONTENT_BUNDLE_DIR;
    else process.env.CONTENT_BUNDLE_DIR = previous;
    resetContentCache();
  };
};

describe('catalog lookups', () => {
  let dir;
  let restore;

  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'content-store-'));
    writeCatalog(dir, ITEMS);
    writeFileSync(path.join(dir, 'quiz-answers.json'), JSON.stringify(QUIZ_ANSWERS));
    restore = useBundleDir(dir);
  });

  after(() => {
    restore();
    rmSync(dir, { recursive: true, force: true });
  });

  test('lists every item in published order', () => {
    assert.deepEqual(listItems().map(item => item.slug), ITEMS.map(item => item.slug));
  });

  test('resolves slugs, including stored links that carry a trailing slash', () => {
    assert.deepEqual(getItemBySlug('two-sum'), PROBLEM);
    assert.equal(getItemBySlug('two-sum/').slug, 'two-sum');
    assert.equal(getItemBySlug('missing'), null);
    assert.equal(getItemBySlug(undefined), null);
  });

  test('resolves the ids progress is keyed on, coercing non-string ids', () => {
    assert.equal(getItemByLegacyId('legacy-problem').slug, 'two-sum');
    assert.equal(getItemByLegacyId({ toString: () => 'legacy-quiz' }).slug, 'cache-eviction-quiz');
    assert.equal(getItemByLegacyId('caching'), null, 'a slug is not a progress id');
    assert.equal(getItemByLegacyId(null), null);
    assert.equal(getItemByLegacyId(undefined), null);
  });

  test('maps item types to the solver older clients expect', () => {
    assert.equal(answerFormatFor(PROBLEM), 'code');
    assert.equal(answerFormatFor(QUIZ), 'mcq');
    assert.equal(answerFormatFor(CASE_STUDY), 'design_doc');
    assert.equal(answerFormatFor(MODULE), null);
    assert.equal(answerFormatFor(undefined), null);
  });

  test('summarises a problem with the fields list rows and cards read', () => {
    assert.deepEqual(toQuestionSummary(PROBLEM), {
      _id: 'legacy-problem',
      name: 'Two Sum',
      link: 'two-sum/',
      slug: 'two-sum',
      type: 'problem',
      group: 'Arrays & Hashing',
      difficulty: 'Easy',
      domain: 'algorithms',
      answerFormat: 'code'
    });
  });

  test('summaries fall back to the slug and carry a quiz topic', () => {
    assert.equal(toQuestionSummary(CASE_STUDY).link, 'design-url-shortener');
    assert.equal(toQuestionSummary(CASE_STUDY).difficulty, null);
    assert.equal(toQuestionSummary(QUIZ).topic, 'caching');
    assert.equal(toQuestionSummary(null), null);
  });

  test('summaries never carry answer keys, even from a polluted item', () => {
    const polluted = {
      ...QUIZ,
      options: [{ id: 'a', text: 'LRU', isCorrect: true, explanation: 'secret' }],
      testCases: [{ input: '1', output: '1', isHidden: true }],
      designPrompt: { sampleAnswer: 'secret' }
    };
    const json = JSON.stringify(toQuestionSummary(polluted));
    for (const field of ['isCorrect', 'testCases', 'isHidden', 'sampleAnswer', 'options', 'explanation']) {
      assert.ok(!json.includes(`"${field}"`), `summary leaked ${field}`);
    }
  });

  test('rereads the bundle from disk after resetContentCache', () => {
    listItems();
    const extra = { ...PROBLEM, slug: 'three-sum', link: 'three-sum/', legacyId: 'legacy-three' };
    writeCatalog(dir, [...ITEMS, extra]);
    assert.equal(getItemBySlug('three-sum'), null, 'cached catalog is still served');
    resetContentCache();
    assert.equal(getItemBySlug('three-sum').legacyId, 'legacy-three');
    writeCatalog(dir, ITEMS);
    resetContentCache();
  });
});

describe('gradeQuiz', () => {
  let dir;
  let restore;

  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'content-store-'));
    writeFileSync(path.join(dir, 'quiz-answers.json'), JSON.stringify(QUIZ_ANSWERS));
    restore = useBundleDir(dir);
  });

  after(() => {
    restore();
    rmSync(dir, { recursive: true, force: true });
  });

  test('passes the correct option and explains every option', () => {
    const graded = gradeQuiz('cache-eviction-quiz', 'a');
    assert.equal(graded.passed, true);
    assert.equal(graded.selectedOptionId, 'a');
    assert.equal(graded.correctOptionId, 'a');
    assert.deepEqual(graded.explanations.map(e => e.id), ['a', 'b']);
  });

  test('fails a wrong option but still reveals the correct one', () => {
    const graded = gradeQuiz('cache-eviction-quiz/', 'b');
    assert.equal(graded.passed, false);
    assert.equal(graded.selectedOptionId, 'b');
    assert.equal(graded.correctOptionId, 'a');
  });

  test('reports an unknown option as unselected rather than wrong', () => {
    const graded = gradeQuiz('cache-eviction-quiz', 'z');
    assert.equal(graded.passed, false);
    assert.equal(graded.selectedOptionId, null);
  });

  test('returns null for a quiz with no answer key', () => {
    assert.equal(gradeQuiz('two-sum', 'a'), null);
  });
});

describe('missing bundles fail closed', () => {
  let dir;
  let restore;

  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'content-store-empty-'));
    restore = useBundleDir(dir);
  });

  after(() => {
    restore();
    rmSync(dir, { recursive: true, force: true });
  });

  test('every lookup reports not found instead of throwing', () => {
    assert.deepEqual(listItems(), []);
    assert.equal(getItemBySlug('two-sum'), null);
    assert.equal(getItemByLegacyId('legacy-problem'), null);
    assert.equal(gradeQuiz('cache-eviction-quiz', 'a'), null);
    assert.equal(getGradingSpec('two-sum'), null);
  });
});
