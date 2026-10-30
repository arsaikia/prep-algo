import test from 'node:test';
import assert from 'node:assert/strict';
import { contentUrl, localReturnTo } from '../src/utils/navigation.js';
import { TimeTracker } from '../src/utils/timerState.js';
import { readDraft, writeDraft, clearDraft } from '../src/utils/draftStorage.js';
import { findQuestionEntry, toSandboxQuestion } from '../src/content/sandboxQuestion.js';
import buildQuestionGroups from '../src/content/buildQuestionGroups.js';
import authReducer from '../src/reducers/authReducer.js';
import questionReducer from '../src/reducers/questionsReducer.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test('canonical content URLs preserve identity and only local return routes are accepted', () => {
  assert.equal(contentUrl({ slug: 'cap-theorem-fundamentals', type: 'quiz' }), '/codesandbox?question=cap-theorem-fundamentals');
  assert.equal(contentUrl({ slug: 'a & b/#/', type: 'topic' }), '/system-design/a%20%26%20b%2F%23');
  assert.equal(contentUrl({ link: 'two-sum/' }), '/codesandbox?question=two-sum');
  const workspace = '/codesandbox?question=two-sum#editor';
  assert.equal(localReturnTo(workspace), workspace);
  for (const unsafe of ['//evil.test', '/\\evil.test', 'https://evil.test', '/\nevil.test', '/login?returnTo=//evil', '/login/', '/LOGIN', '/%6Cogin', null]) {
    assert.equal(localReturnTo(unsafe), '/');
  }
});

test('content type and revision survive adaptation; missing items never resolve to a default question', () => {
  const quiz = { slug: 'cap', legacyId: 'q1', revision: '0123456789', type: 'quiz', title: 'CAP', options: [{ id: 'a', text: 'A', correct: true }], lists: ['SD TOP 25'], group: 'Design' };
  const topic = { slug: 'topic', type: 'topic', group: 'Design' };
  const index = { items: [quiz, topic, { slug: 'module', type: 'module' }] };
  assert.equal(findQuestionEntry(index, 'cap/'), quiz);
  assert.equal(findQuestionEntry(index, 'missing'), null);
  assert.equal(findQuestionEntry(index, 'module'), null);
  const adapted = toSandboxQuestion(quiz);
  assert.equal(adapted.answerFormat, 'mcq');
  assert.equal(adapted.revision, quiz.revision);
  assert.deepEqual(adapted.mcqOptions, [{ id: 'a', text: 'A' }]);
  assert.equal(toSandboxQuestion(topic).answerFormat, 'design_doc');
  const grouped = buildQuestionGroups(index.items, [{ questionId: 'q1', solveCount: 1 }]);
  assert.equal(Object.values(grouped.questions).flat().length, 1);
  assert.equal(grouped.questions.Design[0].solved, true);
});

test('sandbox preserves the graded language and JavaScript starter template', () => {
  const types = { language: 'javascript', inputs: ['SCENARIO'], method: 'debounce', output: 'JSON' };
  const question = toSandboxQuestion({
    slug: 'implement-debounce', type: 'problem', types,
    templates: { python: '', javascript: 'function debounce(func, wait) {}' },
  });
  assert.deepEqual(question.types, types);
  assert.equal(question.types.language, 'javascript');
  assert.match(question.templates.javascript, /function debounce/);
  assert.equal(toSandboxQuestion({ type: 'problem' }).types, null);
});

test('authentication restoration, actual login result and logout are distinct; late restore cannot switch accounts', () => {
  let state = authReducer(undefined, {});
  assert.equal(state.status, 'unknown');
  state = authReducer(state, { type: 'FETCH_USER_INFO' });
  assert.equal(state.status, 'restoring');
  assert.equal(state.isAuthenticated, false);
  state = authReducer(state, { type: 'GOOGLE_LOGIN' });
  assert.equal(state.signingIn, true);
  state = authReducer(state, { type: 'FETCH_USER_INFO_SUCCESS', payload: { id: 'old-user' } });
  assert.equal(state.userId, 'guest');
  state = authReducer(state, { type: 'GOOGLE_LOGIN_SUCCESS', payload: { id: 'new-user', token: 'test-token' } });
  assert.equal(state.status, 'authenticated');
  assert.equal(state.userId, 'new-user');
  assert.equal(state.signingIn, false);
  state = authReducer(state, { type: 'RESET_AUTH_SUCCESS' });
  state = authReducer(state, { type: 'FETCH_USER_INFO_SUCCESS', payload: { id: 'old-user' } });
  assert.equal(state.status, 'guest');
  assert.equal(state.userId, 'guest');
  assert.equal(state.token, null);
  state = authReducer(state, { type: 'GOOGLE_LOGIN' });
  state = authReducer(state, { type: 'GOOGLE_LOGIN_FAILURE', payload: 'Try again' });
  assert.equal(state.error, 'Try again');
  assert.equal(state.signingIn, false);
});

test('timer persists paused elapsed time, stops coherently, restarts and bounds authoritative seconds', () => {
  let now = 1000;
  const storage = memoryStorage();
  const options = { storage: () => storage, now: () => now };
  let tracker = new TimeTracker(options);
  tracker.startTracking('cap', 'user');
  now += 3500;
  tracker.pause();
  assert.equal(tracker.getElapsedSeconds(), 3);
  now += 20000;
  tracker = new TimeTracker(options);
  assert.equal(tracker.restoreSession(), true);
  tracker.startTracking('cap', 'user');
  assert.equal(tracker.isPaused, true);
  assert.equal(tracker.getElapsedSeconds(), 3);
  tracker.resume();
  now += 2500;
  assert.equal(tracker.getElapsedSeconds(), 6);
  tracker.pause();
  now += 9000;
  assert.equal(tracker.stopTracking().timeSpent, .1);
  assert.equal(tracker.isTracking, false);
  assert.equal(tracker.isPaused, false);
  now += 5000;
  assert.equal(tracker.getElapsedSeconds(), 6);
  tracker.startTracking('cap', 'user');
  assert.equal(tracker.getElapsedSeconds(), 0);
  now += 90000000;
  assert.equal(tracker.getElapsedSeconds(), 86400);
  tracker.startTracking('cap', 'another-user');
  assert.equal(tracker.getElapsedSeconds(), 0);
  tracker.startTracking('new-question', 'guest');
  now += 5000;
  tracker.startTracking('new-question', 'signed-in-user');
  assert.equal(tracker.getElapsedSeconds(), 5);
});

test('empty drafts are valid, buffers are isolated and denied storage never breaks work or timers', () => {
  const storage = memoryStorage();
  assert.equal(readDraft('q1', 'python', storage), null);
  assert.equal(writeDraft('q1', 'python', '', storage), true);
  assert.equal(readDraft('q1', 'python', storage), '');
  writeDraft('q1', 'javascript', 'different', storage);
  assert.equal(readDraft('q1', 'python', storage), '');
  assert.equal(readDraft('q1', 'javascript', storage), 'different');
  assert.equal(readDraft('q2', 'python', storage), null);
  clearDraft('q1', 'python', storage);
  assert.equal(readDraft('q1', 'python', storage), null);
  let warnings = 0;
  const warn = () => { warnings += 1; };
  const denied = new Proxy({}, { get: () => { throw new Error('Storage disabled'); } });
  assert.equal(readDraft('q', 'python', denied, warn), null);
  assert.equal(writeDraft('q', 'python', 'code', denied, warn), false);
  assert.equal(clearDraft('q', 'python', denied, warn), false);
  assert.equal(readDraft('q', 'python', () => { throw new Error('Storage access denied'); }, warn), null);
  let now = 0;
  const tracker = new TimeTracker({ storage: () => denied, onStorageError: warn, now: () => now });
  tracker.startTracking('q', 'user');
  now = 4000;
  assert.equal(tracker.getElapsedSeconds(), 4);
  tracker.pause();
  tracker.resume();
  tracker.stopTracking();
  assert.ok(warnings >= 7);
  storage.setItem('currentSession', JSON.stringify({ startedAt: 0, pausedMs: -1, pausedAt: null, endedAt: null, questionId: 'q', userId: 'u', tags: [] }));
  assert.equal(new TimeTracker({ storage: () => storage }).restoreSession(), false);
});

test('progress unavailable is not zero, public content survives auth reset, stale account results are discarded', () => {
  const publicData = { groups: ['Array'], questions: { Array: [{ slug: 'two-sum' }] } };
  let state = questionReducer(undefined, { type: 'GET_ALL_QUESTIONS_WITHOUT_HISTORY_SUCCESS', payload: publicData });
  state = questionReducer(state, { type: 'GET_QUESTIONS', userId: 'alice' });
  state = questionReducer(state, { type: 'GET_ALL_QUESTIONS', userId: 'alice', payload: publicData, progressRows: [], progressError: null });
  assert.equal(state.progressStatus, 'ready');
  state = questionReducer(state, { type: 'GET_ALL_QUESTIONS', userId: 'alice', payload: publicData, progressRows: [], progressError: 'Unavailable' });
  assert.equal(state.progressStatus, 'unavailable');
  assert.deepEqual(state.progressRows, []);
  state = questionReducer(state, { type: 'GET_QUESTIONS', userId: 'bob' });
  const before = state;
  state = questionReducer(state, { type: 'GET_ALL_QUESTIONS', userId: 'alice', payload: publicData });
  assert.equal(state, before);
  state = questionReducer(state, { type: 'GET_QUESTIONS', userId: 'bob', domain: 'frontend' });
  const frontendRequest = state;
  state = questionReducer(state, { type: 'GET_ALL_QUESTIONS', userId: 'bob', domain: 'algorithms', payload: publicData });
  assert.equal(state, frontendRequest);
  state = questionReducer(state, { type: 'RESET_AUTH_SUCCESS' });
  assert.equal(state.progressRows, null);
  assert.equal(state.allQuestionsWithoutHistory, publicData);
  assert.deepEqual(state.allQuestions.questions, {});
});

test('test results show literals and parameter names, not JSON-encoded strings', async () => {
  const { parameterNames, labelInputs, formatLiteral, formatValue, statusLabel } = await import('../src/utils/testResultFormat.js');
  const template = 'class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass';
  assert.deepEqual(parameterNames(template), ['nums', 'target']);
  assert.deepEqual(parameterNames('def f(self, grid: Dict[str, List[int]], k=3):'), ['grid', 'k']);
  assert.deepEqual(labelInputs(['[0,1,0,3,12]'], ['nums']), [{ name: 'nums', value: '[0,1,0,3,12]' }]);
  assert.equal(formatLiteral('[1, 3, 12, 0, 0]'), '[1,3,12,0,0]');
  assert.equal(formatLiteral('"abc"'), '"abc"');
  assert.equal(formatLiteral('sha256:ab'), '(large answer)');
  assert.equal(formatValue([1, 3]), '[1,3]');
  assert.equal(formatValue('abc'), '"abc"');
  assert.equal(statusLabel({ status: 'tle', passed: false }), 'Time Limit Exceeded');
});

test('route titles are specific, never stale, and lesson titles refine the System Design default', async () => {
  const { routeTitle, formatTitle, systemDesignSlug } = await import('../src/utils/documentTitle.js');
  assert.equal(routeTitle('/'), 'PrepAlgo');
  assert.equal(routeTitle('/codesandbox'), 'Code Sandbox · PrepAlgo');
  assert.equal(routeTitle('/frontend/'), 'Frontend · PrepAlgo');
  assert.equal(routeTitle('/system-design'), 'System Design · PrepAlgo');
  assert.equal(routeTitle('/404'), 'Page not found · PrepAlgo');
  assert.equal(routeTitle('/unknown'), 'Page not found · PrepAlgo');
  assert.equal(routeTitle('/system-design/cap-theorem'), 'System Design · PrepAlgo');
  assert.equal(routeTitle('/system-design/cap-theorem', { lessonTitle: 'CAP Theorem' }), 'CAP Theorem · System Design · PrepAlgo');
  assert.equal(systemDesignSlug('/system-design/a%20b/'), 'a b');
  assert.equal(systemDesignSlug('/system-design'), null);
  assert.equal(systemDesignSlug('/system-design/a/b'), null);
  assert.equal(formatTitle('Two Sum'), 'Two Sum · PrepAlgo');
  assert.equal(formatTitle(undefined, ' '), 'PrepAlgo');
});

test('frontend lists separate exercises from quizzes', async () => {
  const { splitFrontendSections, filterGroupsByKind, FRONTEND_KINDS } = await import('../src/utils/tracks.js');
  const grouped = {
    'DOM & Browser': [{ name: 'debounce', type: 'problem' }, { name: 'cors', type: 'quiz' }],
    CSS: [{ name: 'box', type: 'quiz' }],
  };
  const [exercises, quizzes] = splitFrontendSections(grouped);
  assert.equal(exercises.id, 'exercises');
  assert.deepEqual(exercises.groups, { 'DOM & Browser': [{ name: 'debounce', type: 'problem' }] });
  assert.equal(exercises.count, 1);
  assert.deepEqual(Object.keys(quizzes.groups), ['DOM & Browser', 'CSS']);
  assert.equal(quizzes.count, 2);
  assert.deepEqual(filterGroupsByKind(grouped, FRONTEND_KINDS[1]).CSS, [{ name: 'box', type: 'quiz' }]);
});
