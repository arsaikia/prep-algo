import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  allocateDomainSlots,
  getNextDifficultyAdaptive,
  selectCandidates,
  isRecommendable,
  recQuestionId
} from '../controller/smartRecommendations.js';

const sum = slots => Object.values(slots).reduce((a, b) => a + b, 0);

const ALL_AVAILABLE = { algorithms: 50, system_design: 50, frontend: 50 };

describe('allocateDomainSlots', () => {
  test('hands every slot to algorithms when no domain has questions', () => {
    const slots = allocateDomainSlots(5, {}, { algorithms: 0, system_design: 0, frontend: 0 });
    assert.deepEqual(slots, { algorithms: 5 });
  });

  test('never allocates to a domain with nothing available', () => {
    const slots = allocateDomainSlots(6, {}, { algorithms: 20, system_design: 0, frontend: 10 });
    assert.equal(slots.system_design, undefined);
    assert.ok(slots.algorithms > 0);
    assert.ok(slots.frontend > 0);
  });

  test('splits evenly across domains when no preferences are set', () => {
    const slots = allocateDomainSlots(6, {}, ALL_AVAILABLE);
    assert.equal(sum(slots), 6);
    assert.deepEqual(slots, { algorithms: 2, system_design: 2, frontend: 2 });
  });

  test('honours weighted preferences', () => {
    const prefs = {
      algorithms: { weight: 0.6 },
      system_design: { weight: 0.2 },
      frontend: { weight: 0.2 }
    };
    const slots = allocateDomainSlots(10, prefs, ALL_AVAILABLE);
    assert.equal(sum(slots), 10);
    assert.equal(slots.algorithms, 6);
  });

  test('gives every available domain at least one slot', () => {
    const prefs = {
      algorithms: { weight: 0.9 },
      system_design: { weight: 0.05 },
      frontend: { weight: 0.05 }
    };
    const slots = allocateDomainSlots(5, prefs, ALL_AVAILABLE);
    Object.values(slots).forEach(v => assert.ok(v >= 1, 'each domain keeps a slot'));
  });

  test('never promises more questions than a domain actually has', () => {
    const scarce = { algorithms: 1, system_design: 1, frontend: 1 };
    const slots = allocateDomainSlots(9, {}, scarce);
    Object.entries(slots).forEach(([domain, n]) => {
      assert.ok(n <= scarce[domain], `${domain} asked for ${n} of ${scarce[domain]}`);
    });
    assert.equal(sum(slots), 3, 'caps at total capacity rather than the request');
  });

  test('spends spare slots on a deep domain when others are exhausted', () => {
    const avail = { algorithms: 50, system_design: 1, frontend: 1 };
    const slots = allocateDomainSlots(10, {}, avail);
    assert.equal(sum(slots), 10, 'still fills the full request');
    Object.entries(slots).forEach(([domain, n]) => {
      assert.ok(n <= avail[domain], `${domain} asked for ${n} of ${avail[domain]}`);
    });
    assert.equal(slots.algorithms, 8);
  });

  test('respects capacity across a range of counts and availabilities', () => {
    const availabilities = [
      { algorithms: 50, system_design: 50, frontend: 50 },
      { algorithms: 50, system_design: 1, frontend: 1 },
      { algorithms: 2, system_design: 3, frontend: 0 },
      { algorithms: 1, system_design: 1, frontend: 1 },
      { algorithms: 4, system_design: 0, frontend: 0 }
    ];
    for (const avail of availabilities) {
      const capacity = Object.values(avail).reduce((a, b) => a + b, 0);
      for (let count = 1; count <= 12; count += 1) {
        const slots = allocateDomainSlots(count, {}, avail);
        const label = `${JSON.stringify(avail)} count=${count}`;
        assert.equal(sum(slots), Math.min(count, capacity), `sum mismatch for ${label}`);
        Object.entries(slots).forEach(([domain, n]) => {
          assert.ok(n <= avail[domain], `over-promised ${domain} for ${label}`);
        });
      }
    }
  });

  test('allocates exactly the requested count across a range of inputs', () => {
    for (let count = 3; count <= 12; count += 1) {
      const slots = allocateDomainSlots(count, {}, ALL_AVAILABLE);
      assert.equal(sum(slots), count, `count=${count} produced ${sum(slots)}`);
    }
  });

  test('allocates exactly the requested count under lopsided weights', () => {
    const prefs = {
      algorithms: { weight: 0.7 },
      system_design: { weight: 0.15 },
      frontend: { weight: 0.15 }
    };
    for (let count = 3; count <= 12; count += 1) {
      const slots = allocateDomainSlots(count, prefs, ALL_AVAILABLE);
      assert.equal(sum(slots), count, `count=${count} produced ${sum(slots)}`);
    }
  });

  test('tolerates a missing preferences object', () => {
    const slots = allocateDomainSlots(6, undefined, ALL_AVAILABLE);
    assert.equal(sum(slots), 6);
  });
});

describe('getNextDifficultyAdaptive', () => {
  test('starts a user with no history on Easy', () => {
    assert.equal(getNextDifficultyAdaptive('beginner', {}), 'Easy');
  });

  test('promotes a beginner past Easy once they dominate it', () => {
    const stats = { Easy: 80, Medium: 10, Hard: 10 };
    assert.equal(getNextDifficultyAdaptive('beginner', stats), 'Medium');
  });

  test('keeps a beginner on Easy while Easy is not yet dominant', () => {
    const stats = { Easy: 5, Medium: 5, Hard: 0 };
    assert.equal(getNextDifficultyAdaptive('beginner', stats), 'Easy');
  });

  test('promotes an intermediate to Hard once Medium is dominant', () => {
    const stats = { Easy: 10, Medium: 70, Hard: 20 };
    assert.equal(getNextDifficultyAdaptive('intermediate', stats), 'Hard');
  });
});

const item = (legacyId, fields = {}) => ({
  type: 'problem',
  legacyId,
  slug: legacyId,
  domain: 'algorithms',
  group: 'Arrays',
  difficulty: 'Easy',
  ...fields
});

const POOL = [
  item('a1'),
  item('a2', { difficulty: 'Medium' }),
  item('a3', { group: 'Graphs', difficulty: 'Hard' }),
  item('f1', { domain: 'frontend', group: 'CSS' }),
  item('s1', { type: 'quiz', domain: 'system_design', group: 'Caching', difficulty: 'Medium' })
];

const ids = items => items.map(i => i.legacyId);

describe('selectCandidates', () => {
  test('keeps catalog order when nothing is filtered', () => {
    assert.deepEqual(ids(selectCandidates(POOL)), ['a1', 'a2', 'a3', 'f1', 's1']);
  });

  test('drops excluded ids, including non-string ids', () => {
    const excluded = ['a1', { toString: () => 'a3' }];
    assert.deepEqual(ids(selectCandidates(POOL, { exclude: excluded, domain: 'algorithms' })), ['a2']);
  });

  test('filters by domain and group', () => {
    assert.deepEqual(ids(selectCandidates(POOL, { domain: 'frontend' })), ['f1']);
    assert.deepEqual(ids(selectCandidates(POOL, { domain: 'algorithms', groups: ['Graphs'] })), ['a3']);
  });

  test('treats a difficulty list as any of', () => {
    assert.deepEqual(ids(selectCandidates(POOL, { domain: 'algorithms', difficulty: 'Medium' })), ['a2']);
    assert.deepEqual(
      ids(selectCandidates(POOL, { domain: 'algorithms', difficulty: ['Easy', 'Hard'] })),
      ['a1', 'a3']
    );
  });

  test('takes the first `limit` matches', () => {
    assert.deepEqual(ids(selectCandidates(POOL, { limit: 2 })), ['a1', 'a2']);
    assert.deepEqual(selectCandidates(POOL, { limit: 0 }), []);
  });

  test('matches nothing for an empty group list', () => {
    assert.deepEqual(selectCandidates(POOL, { groups: [] }), []);
  });
});

describe('isRecommendable', () => {
  test('accepts problems and quizzes that progress can be keyed on', () => {
    assert.equal(isRecommendable(item('p')), true);
    assert.equal(isRecommendable(item('q', { type: 'quiz' })), true);
  });

  test('rejects reader topics, modules, unkeyed items and missing items', () => {
    assert.equal(isRecommendable(item('t', { type: 'topic' })), false);
    assert.equal(isRecommendable(item('m', { type: 'module' })), false);
    assert.equal(isRecommendable(item(undefined)), false);
    assert.equal(isRecommendable(null), false);
  });
});

describe('recQuestionId', () => {
  test('reads bare and hydrated question refs alike', () => {
    assert.equal(recQuestionId({ question: 'q-1' }), 'q-1');
    assert.equal(recQuestionId({ question: { _id: 'q-2', name: 'Two Sum' } }), 'q-2');
    assert.equal(recQuestionId({ question: { id: 'q-3' } }), 'q-3');
  });

  test('returns undefined when the recommendation has no question', () => {
    assert.equal(recQuestionId({ question: null }), undefined);
    assert.equal(recQuestionId({}), undefined);
    assert.equal(recQuestionId(undefined), undefined);
  });
});
