import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runPythonCode } from '../utils/codeExecution.js';

/**
 * Design problems ("implement LRUCache") cannot be graded by the normal
 * single-function driver: the answer is not one return value, it is the
 * sequence of values produced by replaying calls against one live object.
 *
 * The OPS input type makes that sequence pure data, so adding a new design
 * problem stays a content change and never becomes a backend change.
 *
 * The error paths matter as much as the happy path. A learner who names the
 * class wrong or forgets a method must be told which name was expected —
 * otherwise a design problem fails as an unexplained zero, which is exactly
 * the silent-failure class this project keeps having to hunt down.
 */

const OPS_TYPES = { inputs: ['OPS', 'OPS'], output: 'ARRAY' };

const MIN_STACK = `class MinStack:
    def __init__(self):
        self.stack = []
        self.mins = []

    def push(self, val):
        self.stack.append(val)
        self.mins.append(val if not self.mins else min(val, self.mins[-1]))

    def pop(self):
        self.stack.pop()
        self.mins.pop()

    def top(self):
        return self.stack[-1]

    def getMin(self):
        return self.mins[-1]
`;

const opsCase = (calls, args, expected) => [
    { inputs: [JSON.stringify(calls), JSON.stringify(args)], expectedOutput: JSON.stringify(expected) },
];

describe('OPS driver', () => {
    it('replays a call sequence against a single instance', async () => {
        const results = await runPythonCode(
            MIN_STACK,
            opsCase(
                ['MinStack', 'push', 'push', 'push', 'getMin', 'pop', 'top', 'getMin'],
                [[], [-2], [0], [-3], [], [], [], []],
                [null, null, null, null, -3, null, 0, -2],
            ),
            OPS_TYPES,
        );

        assert.equal(results[0].error, null);
        assert.equal(results[0].passed, true);
    });

    it('reports the constructor as null rather than dropping it', async () => {
        const results = await runPythonCode(
            MIN_STACK,
            opsCase(['MinStack', 'push', 'getMin'], [[], [5], []], [null, null, 5]),
            OPS_TYPES,
        );

        assert.equal(results[0].passed, true);
        assert.deepEqual(results[0].actualOutput, [null, null, 5]);
    });

    it('fails a wrong answer instead of passing it', async () => {
        const wrong = MIN_STACK.replace('return self.mins[-1]', 'return self.stack[-1]');

        const results = await runPythonCode(
            wrong,
            opsCase(['MinStack', 'push', 'push', 'getMin'], [[], [5], [9], []], [null, null, null, 5]),
            OPS_TYPES,
        );

        assert.equal(results[0].passed, false);
    });

    it('names the class it expected when the class is missing', async () => {
        const results = await runPythonCode(
            'class Stack:\n    def __init__(self):\n        pass\n',
            opsCase(['MinStack', 'getMin'], [[], []], [null, 5]),
            OPS_TYPES,
        );

        assert.equal(results[0].passed, false);
        assert.match(results[0].error, /MinStack/);
    });

    it('names the method it expected when the method is missing', async () => {
        const partial = `class MinStack:
    def __init__(self):
        self.stack = []

    def push(self, val):
        self.stack.append(val)
`;

        const results = await runPythonCode(
            partial,
            opsCase(['MinStack', 'push', 'getMin'], [[], [5], []], [null, null, 5]),
            OPS_TYPES,
        );

        assert.equal(results[0].passed, false);
        assert.match(results[0].error, /getMin/);
    });

    it('rejects a test case whose calls and arguments disagree', async () => {
        const results = await runPythonCode(
            MIN_STACK,
            opsCase(['MinStack', 'push', 'getMin'], [[], [5]], [null, null, 5]),
            OPS_TYPES,
        );

        assert.equal(results[0].passed, false);
        assert.match(results[0].error, /argument groups/);
    });
});
