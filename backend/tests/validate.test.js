import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../middleware/validate.js';
import { solveHistorySchema } from '../schemas/code.js';

// Runs the middleware and reports whether it responded, passed control on,
// or forwarded an error (which the error handler would turn into a 500).
const run = (schema, body) =>
  new Promise(resolve => {
    const req = { body };
    const res = {
      status(code) {
        return { json: payload => resolve({ kind: 'response', code, payload }) };
      },
    };
    validate(schema)(req, res, err =>
      resolve(err ? { kind: 'error', err } : { kind: 'next', body: req.body })
    );
  });

const body = {
  userId: 'user-1',
  questionId: '4fad4819-3db1-4333-8932-6a0c5440273d',
  note: 'Review this problem',
};

describe('validate', () => {
  // Zod 4 moved the issue list from `err.errors` to `err.issues`; reading the
  // old name threw inside the handler and turned every 400 into a 500.
  test('rejects an invalid body with a 400 that names the failing fields', async () => {
    const result = await run(solveHistorySchema, { ...body, userId: '', difficultyRating: 9 });
    assert.equal(result.kind, 'response');
    assert.equal(result.code, 400);
    assert.equal(result.payload.error, 'Validation failed');
    assert.deepEqual(
      result.payload.details.map(d => d.path).sort(),
      ['difficultyRating', 'userId']
    );
  });

  test('passes valid annotations through without creating solve defaults', async () => {
    const result = await run(solveHistorySchema, body);
    assert.equal(result.kind, 'next');
    assert.equal(result.body.note, body.note);
    assert.equal(result.body.success, undefined);
  });

  test('rejects client attempts to declare a solve', async () => {
    const result = await run(solveHistorySchema, { ...body, success: true, solveCount: 1 });
    assert.equal(result.kind, 'response');
    assert.equal(result.code, 400);
  });

  test('forwards errors that are not validation failures', async () => {
    const boom = new Error('boom');
    const result = await run({ parse: () => { throw boom; } }, body);
    assert.equal(result.kind, 'error');
    assert.equal(result.err, boom);
  });
});
