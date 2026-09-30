import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resetContentCache } from '../utils/contentStore.js';
import { getQuestionById } from '../controller/questionController.js';
import {
  findQuestionEntry,
  toSandboxQuestion,
  toSlug
} from '../../frontend/src/content/sandboxQuestion.js';

/*
 * The sandbox reads question bodies from the CDN and falls back to
 * GET /api/v1/questions/:slug. That fallback is only safe while both paths
 * produce the same question, so this runs the real handler and the frontend
 * mapper over the same catalog items and compares the results.
 */

const PROBLEM = {
  type: 'problem',
  slug: 'binary-search',
  link: 'binary-search/',
  legacyId: 'legacy-problem',
  title: 'Binary Search',
  domain: 'algorithms',
  group: 'Binary Search',
  difficulty: 'Easy',
  lists: ['ALL', 'TOP 150'],
  order: 0,
  tags: [],
  types: { params: ['List[int]', 'int'], returns: 'int' },
  description: 'Return the index of target in nums, or -1.',
  exampleTestCases: [
    { inputs: ['[-1,0,3,5,9,12]', '9'], expectedOutput: '4', explanation: '9 sits at index 4.' },
    { inputs: ['[5]', '5'], expectedOutput: '0' }
  ],
  templates: { python: 'class Solution: pass', javascript: 'var search = () => {};' },
  availableForSolve: true
};

// Every optional field absent, so both paths have to agree on the defaults.
const BARE_PROBLEM = {
  type: 'problem',
  slug: 'bare-problem',
  legacyId: 'legacy-bare',
  title: 'Bare problem',
  group: 'Misc',
  availableForSolve: false
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
  description: 'Which policy evicts the least recently used entry?',
  options: [{ id: 'a', text: 'LRU' }, { id: 'b', text: 'FIFO' }],
  availableForSolve: true
};

const CASE_STUDY = {
  type: 'topic',
  kind: 'case_study',
  slug: 'design-url-shortener',
  legacyId: 'legacy-topic',
  title: 'Design a URL shortener',
  domain: 'system_design',
  group: 'Distributed Systems',
  module: 'sd-case-studies',
  summary: 'Shorten URLs at scale.',
  body: '## Requirements',
  keyTakeaways: ['Hash, then resolve collisions.'],
  availableForSolve: false
};

const MODULE = {
  type: 'module',
  slug: 'sd-case-studies',
  title: 'Case studies',
  domain: 'system_design',
  group: 'Curriculum',
  availableForSolve: false
};

const ITEMS = [PROBLEM, BARE_PROBLEM, QUIZ, CASE_STUDY, MODULE];

const GRADING = {
  'binary-search': {
    types: PROBLEM.types,
    testCases: [
      { inputs: ['[-1,0,3,5,9,12]', '9'], expectedOutput: '4', explanation: '', isHidden: false },
      { inputs: ['[1,2]', '3'], expectedOutput: '-1', explanation: '', isHidden: true }
    ]
  }
};

// The CDN publishes the same public body the catalog carries, without the
// build-derived availability flag.
const cdnBody = ({ availableForSolve, ...body }) => body;

// Only the answer-bearing grading data stays server-side.
const SERVER_ONLY = ['hiddenTestCaseCount', 'testCases'];

const fetchFromApi = (slug) => new Promise((resolve, reject) => {
  const res = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      resolve({ status: this.statusCode, body });
    }
  };
  getQuestionById({ params: { questionId: slug } }, res, (err) =>
    err ? resolve({ status: err.statusCode, error: err.message }) : reject(new Error('next() without an error')));
});

const withoutServerOnly = (question) =>
  Object.fromEntries(Object.entries(question).filter(([key]) => !SERVER_ONLY.includes(key)));

describe('sandbox question: CDN mapper matches the API', () => {
  let dir;
  let previous;

  before(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'sandbox-parity-'));
    writeFileSync(path.join(dir, 'catalog.json'), JSON.stringify({ version: 1, count: ITEMS.length, items: ITEMS }));
    writeFileSync(path.join(dir, 'testcases.json'), JSON.stringify(GRADING));
    writeFileSync(path.join(dir, 'quiz-answers.json'), JSON.stringify({}));
    previous = process.env.CONTENT_BUNDLE_DIR;
    process.env.CONTENT_BUNDLE_DIR = dir;
    resetContentCache();
  });

  after(() => {
    if (previous === undefined) delete process.env.CONTENT_BUNDLE_DIR;
    else process.env.CONTENT_BUNDLE_DIR = previous;
    resetContentCache();
    rmSync(dir, { recursive: true, force: true });
  });

  for (const item of [PROBLEM, BARE_PROBLEM, QUIZ, CASE_STUDY]) {
    test(`${item.type} "${item.slug}" is the same question from either source`, async () => {
      const api = await fetchFromApi(item.slug);
      assert.equal(api.status, 200);

      const fromCdn = toSandboxQuestion(cdnBody(item));
      assert.deepEqual(fromCdn, withoutServerOnly(api.body));
    });
  }

  test('the API adds only grading data the CDN never publishes', async () => {
    const { body } = await fetchFromApi(PROBLEM.slug);
    const fromCdn = toSandboxQuestion(cdnBody(PROBLEM));

    assert.deepEqual(Object.keys(body).filter(key => !(key in fromCdn)).sort(), SERVER_ONLY);
    assert.deepEqual(body.testCases, [
      { inputs: ['[-1,0,3,5,9,12]', '9'], expectedOutput: '4', isHidden: false }
    ]);
    assert.equal(body.hiddenTestCaseCount, 1);
  });

  test('quiz options carry no answer key', () => {
    const fromCdn = toSandboxQuestion({ ...cdnBody(QUIZ), options: [{ id: 'a', text: 'LRU', isCorrect: true }] });
    assert.deepEqual(fromCdn.mcqOptions, [{ id: 'a', text: 'LRU' }]);
  });

  test('modules are not questions on either path', async () => {
    assert.equal((await fetchFromApi(MODULE.slug)).status, 404);
    assert.equal(findQuestionEntry({ items: ITEMS }, MODULE.slug), null);
  });
});

describe('sandbox question: resolving the ?question= param', () => {
  const index = { items: ITEMS };

  test('accepts slugs and the legacy links that end in a slash', () => {
    assert.equal(findQuestionEntry(index, 'binary-search').slug, 'binary-search');
    assert.equal(findQuestionEntry(index, 'binary-search/').slug, 'binary-search');
    assert.equal(findQuestionEntry(index, ' binary-search// ').slug, 'binary-search');
  });

  test('returns null for unknown, empty or missing input', () => {
    assert.equal(findQuestionEntry(index, 'no-such-question'), null);
    assert.equal(findQuestionEntry(index, ''), null);
    assert.equal(findQuestionEntry(index, null), null);
    assert.equal(findQuestionEntry(undefined, 'binary-search'), null);
  });

  test('toSlug strips only trailing slashes', () => {
    assert.equal(toSlug('two-sum/'), 'two-sum');
    assert.equal(toSlug(undefined), '');
  });
});
