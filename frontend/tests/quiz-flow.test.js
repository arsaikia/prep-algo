import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { ThemeProvider } from 'styled-components';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const fixture = {
  slug: 'cache-check', revision: 'r1', title: 'Choose a cache strategy', type: 'quiz',
  domain: 'system_design', description: 'Which choice fits this workload?',
  mcqOptions: [{ id: 'a', text: 'Cache every write' }, { id: 'b', text: 'Use cache-aside' }],
};
const theme = { colors: {
  text: '#243247', textSecondary: '#526077', primary: '#6750a4', border: '#c4cbd7',
  statusSuccess: '#25734c', statusWarning: '#8a6c20', statusError: '#a43e48', backgroundSecondary: '#f5f6fa',
} };

test('quiz and SD sequence use failed-only retries and explicit pass completion', async (t) => {
  const dom = new JSDOM('<div id="test-root"></div>', { url: 'http://localhost/' });
  const keys = ['window', 'document', 'navigator', 'HTMLElement', 'localStorage', 'IS_REACT_ACT_ENVIRONMENT'];
  const saved = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of keys.slice(0, -1)) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const temporary = await mkdtemp(fileURLToPath(new URL('./.quiz-build-', import.meta.url)));
  const calls = [];
  let respond;
  let fetchItem;
  globalThis.__quizTestApi = { post: async (...args) => { calls.push(args); return respond(...args); } };
  globalThis.__quizTestLoad = (...args) => fetchItem(...args);
  let root;
  let host;
  let store;
  const mount = async (Component, props, auth = { userId: 'guest', status: 'guest' }) => {
    calls.length = 0;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    store = createStore((state = { auth }, action) => action.type === 'auth' ? { auth: action.auth } : state);
    await act(async () => root.render(React.createElement(Provider, { store },
      React.createElement(ThemeProvider, { theme }, React.createElement(Component, props)))));
  };
  const unmount = async () => { await act(async () => root.unmount()); host.remove(); };
  const click = async (node) => {
    assert.ok(node, 'expected an actionable element');
    await act(async () => node.click());
  };
  const button = (text) => [...host.querySelectorAll('button')].find((node) => node.textContent === text);
  const choose = (id) => click(host.querySelector(`input[value="${id}"]`));
  const graded = (passed, extra = {}) => ({ data: { data: {
    passed, correctOptionId: 'b', explanations: [{ id: 'b', explanation: 'A cache miss loads from the database.' }],
    attemptSaved: true, progressSaved: true, ...extra,
  } } });

  try {
    await build({
      stdin: {
        contents: `export { default as McqSolver } from './src/components/McqSolver/McqSolver.jsx';
          export { default as TopicQuiz } from './src/pages/systemDesign/TopicQuiz.jsx';
          export { buildCurriculum } from './src/content/useCurriculum.js';`,
        resolveDir: fileURLToPath(new URL('../', import.meta.url)),
      },
      outfile: `${temporary}/components.cjs`, bundle: true, platform: 'node', format: 'cjs',
      packages: 'external', logLevel: 'silent',
      plugins: [{
        name: 'quiz-network-fixtures',
        setup(build) {
          build.onResolve({ filter: /^styled-components$/ }, ({ kind }) => kind === 'require-call'
            ? { path: 'styled-components', external: true }
            : { path: 'styled', namespace: 'fixture' });
          build.onResolve({ filter: /api\/client\.js$/ }, () => ({ path: 'api', namespace: 'fixture' }));
          build.onResolve({ filter: /content\/loader(?:\.js)?$/ }, () => ({ path: 'content', namespace: 'fixture' }));
          build.onResolve({ filter: /^\.\/loader$/ }, () => ({ path: 'content', namespace: 'fixture' }));
          build.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
            contents: path === 'styled'
              ? 'const { default: styled } = require("styled-components"); export default styled;'
              : path === 'api'
              ? 'export default globalThis.__quizTestApi;'
              : 'export const loadItem = (...args) => globalThis.__quizTestLoad(...args); export const loadIndex = async () => ({items:[]});',
          }));
        },
      }],
    });
    const { McqSolver, TopicQuiz, buildCurriculum } = require(`${temporary}/components.cjs`);

    await t.test('curriculum retains every linked quiz and sorts by order then slug', () => {
      const { quizByTopic } = buildCurriculum([
        { type: 'quiz', slug: 'z', topic: 'cache', order: 2 },
        { type: 'quiz', slug: 'b', topic: 'cache', order: 1 },
        { type: 'quiz', slug: 'a', topic: 'cache', order: 1 },
        { type: 'quiz', slug: 'unlinked', order: 0 },
      ]);
      assert.deepEqual(quizByTopic.get('cache').map((quiz) => quiz.slug), ['a', 'b', 'z']);
      assert.equal(quizByTopic.size, 1);
    });

    await t.test('failure unlocks a new attempt; success closes without restart', async () => {
      respond = () => graded(calls.at(-1)[1].selectedOptionId === 'b');
      await mount(McqSolver, { question: fixture, isGuest: true });
      assert.ok(button('Submit Answer').disabled);
      await choose('a');
      await click(button('Submit Answer'));
      assert.match(host.textContent, /Incorrect/);
      assert.ok(host.querySelector('input').disabled);
      const failedId = calls[0][1].submissionId;
      await click(button('Try a new attempt'));
      assert.equal(host.querySelector('input').disabled, false);
      await choose('b');
      await click(button('Submit Answer'));
      assert.match(host.textContent, /Correct!/);
      assert.notEqual(calls[1][1].submissionId, failedId);
      assert.equal(button('Try a new attempt'), undefined);
      await click(button('Complete and close quiz'));
      assert.match(host.textContent, /Quiz complete/);
      assert.equal(host.querySelector('input'), null);
      assert.equal(host.querySelector('button'), null);
      await unmount();
    });

    await t.test('network retry reuses its receipt; a failed save blocks completion until saved', async () => {
      respond = () => { throw new Error('Offline'); };
      await mount(McqSolver, { question: fixture, isGuest: false }, { userId: 'alice', status: 'authenticated' });
      await choose('b');
      await click(button('Submit Answer'));
      const id = calls[0][1].submissionId;
      assert.ok(host.querySelector('[role="alert"]'));
      respond = () => graded(true, { attemptSaved: false, progressSaved: false });
      await click(button('Submit Answer'));
      assert.equal(calls[1][1].submissionId, id);
      assert.ok(button('Complete and close quiz').disabled);
      assert.equal(button('Try a new attempt'), undefined);
      respond = () => graded(true);
      await click(button('Retry saving answer'));
      assert.equal(calls[2][1].submissionId, id);
      assert.equal(button('Complete and close quiz').disabled, false);
      await unmount();
    });

    await t.test('a pending grade locks submission and cannot update a different account', async () => {
      let release;
      respond = () => new Promise((resolve) => { release = resolve; });
      await mount(McqSolver, { question: fixture, isGuest: false }, { userId: 'alice', status: 'authenticated' });
      await choose('b');
      await click(button('Submit Answer'));
      assert.ok(button('Checking…').disabled);
      assert.ok(host.querySelector('input').disabled);
      assert.equal(calls.length, 1);
      await act(async () => store.dispatch({ type: 'auth', auth: { userId: 'bob', status: 'authenticated' } }));
      await act(async () => store.dispatch({ type: 'auth', auth: { userId: 'alice', status: 'authenticated' } }));
      await act(async () => release(graded(true)));
      assert.doesNotMatch(host.textContent, /Correct!/);
      assert.ok(button('Submit Answer'));
      await unmount();
    });

    await t.test('passed standalone quizzes invoke completion once and reject malformed grading', async () => {
      let completed = 0;
      respond = () => ({ data: { data: { passed: 'yes' } } });
      await mount(McqSolver, { question: fixture, isGuest: true, onComplete: () => { completed += 1; } });
      await choose('b');
      await click(button('Submit Answer'));
      assert.match(host.querySelector('[role="alert"]').textContent, /Invalid grading response/);
      assert.equal(button('Complete and close quiz'), undefined);
      respond = () => graded(true);
      await click(button('Submit Answer'));
      await click(button('Complete and close quiz'));
      assert.equal(completed, 1);
      assert.equal(host.querySelector('input'), null);
      await unmount();
    });

    await t.test('sequence loads one check at a time, retries load errors, and closes after the last pass', async () => {
      const entries = [{ slug: 'first', h: 'h1' }, { slug: 'second', h: 'h2' }, { slug: 'third', h: 'h3' }];
      const loads = [];
      let failSecond = true;
      fetchItem = async (slug) => {
        loads.push(slug);
        if (slug === 'second' && failSecond) throw new Error('Connection interrupted');
        return { ...fixture, slug, options: fixture.mcqOptions };
      };
      respond = () => graded(true);
      await mount(TopicQuiz, { entries });
      assert.deepEqual(loads, ['first']);
      assert.match(host.textContent, /Question 1 of 3/);
      await choose('b');
      await click(button('Submit Answer'));
      await click(button('Next question'));
      assert.match(host.querySelector('[role="alert"]').textContent, /Connection interrupted/);
      assert.equal(host.querySelector('input'), null, 'the previous question must not remain actionable');
      failSecond = false;
      await click(button('Retry question'));
      assert.match(host.textContent, /Question 2 of 3/);
      for (const label of ['Next question', 'Complete quiz']) {
        await choose('b');
        await click(button('Submit Answer'));
        assert.equal(button('Try a new attempt'), undefined);
        await click(button(label));
      }
      assert.match(host.textContent, /Knowledge check complete/);
      assert.equal(host.querySelector('input'), null);
      assert.equal(host.querySelector('button'), null);
      assert.deepEqual(loads, ['first', 'second', 'second', 'third']);
      assert.equal(calls.length, 3);
      await unmount();
    });

    await t.test('auth changes reset a quiz sequence rather than carrying another account’s pass forward', async () => {
      const entries = [{ slug: 'first', h: 'h1' }, { slug: 'second', h: 'h2' }];
      fetchItem = async (slug) => ({ ...fixture, slug, options: fixture.mcqOptions });
      respond = () => graded(true);
      await mount(TopicQuiz, { entries }, { userId: 'alice', status: 'authenticated' });
      await choose('b');
      await click(button('Submit Answer'));
      await click(button('Next question'));
      assert.match(host.textContent, /Question 2 of 2/);
      await act(async () => store.dispatch({ type: 'auth', auth: { userId: 'bob', status: 'authenticated' } }));
      assert.match(host.textContent, /Question 1 of 2/);
      assert.doesNotMatch(host.textContent, /Correct!/);
      assert.ok(button('Submit Answer'));
      await unmount();
    });
  } finally {
    if (root && host?.isConnected) await act(async () => root.unmount());
    await rm(temporary, { recursive: true, force: true });
    delete globalThis.__quizTestApi;
    delete globalThis.__quizTestLoad;
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    dom.window.close();
  }
});
