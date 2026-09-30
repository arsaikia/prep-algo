import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { requireSelf } from '../middleware/ownership.js';

// Runs the middleware and resolves with the error it passed to next(), or
// the string 'ALLOWED' when it called next() with nothing.
const run = (middleware, req) =>
  new Promise(resolve => {
    middleware(req, {}, err => resolve(err ?? 'ALLOWED'));
  });

describe('requireSelf', () => {
  test('allows a user to address their own resource via params', async () => {
    const result = await run(requireSelf(), {
      user: { _id: 'user-1' },
      params: { userId: 'user-1' }
    });
    assert.equal(result, 'ALLOWED');
  });

  test('blocks a user from addressing another user via params', async () => {
    const result = await run(requireSelf(), {
      user: { _id: 'user-1' },
      params: { userId: 'user-2' }
    });
    assert.equal(result.statusCode, 403);
  });

  test('allows a matching userId in the body', async () => {
    const result = await run(requireSelf('body'), {
      user: { _id: 'user-1' },
      body: { userId: 'user-1' }
    });
    assert.equal(result, 'ALLOWED');
  });

  test('blocks a mismatched userId in the body', async () => {
    const result = await run(requireSelf('body'), {
      user: { _id: 'user-1' },
      body: { userId: 'user-2' }
    });
    assert.equal(result.statusCode, 403);
  });

  test('rejects an unauthenticated request with 401', async () => {
    const result = await run(requireSelf(), { params: { userId: 'user-1' } });
    assert.equal(result.statusCode, 401);
  });

  test('rejects a request with no userId with 400', async () => {
    const result = await run(requireSelf(), { user: { _id: 'user-1' }, params: {} });
    assert.equal(result.statusCode, 400);
  });

  test('compares ids as strings so ObjectId-like values still match', async () => {
    const result = await run(requireSelf(), {
      user: { _id: { toString: () => 'user-1' } },
      params: { userId: 'user-1' }
    });
    assert.equal(result, 'ALLOWED');
  });

  test('does not treat a body userId as authority on a params route', async () => {
    // A caller must not be able to smuggle their own id through the body to
    // reach someone else's :userId route.
    const result = await run(requireSelf(), {
      user: { _id: 'user-1' },
      params: { userId: 'user-2' },
      body: { userId: 'user-1' }
    });
    assert.equal(result.statusCode, 403);
  });
});
