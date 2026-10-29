import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runPythonCode } from '../utils/codeExecution.js';

/**
 * Proves the submission grading path still behaves correctly now that
 * execution goes through the sandbox.
 *
 * The regression that matters most here: the generated harness uses eval() to
 * parse expected values, so the guard must not scrub builtins wholesale. A
 * suite that only proved things were blocked would have shipped a sandbox that
 * blocked legitimate submissions too.
 */

const TWO_SUM_TYPES = { inputs: ['INTEGER_ARRAY', 'INTEGER'], output: 'INTEGER_ARRAY' };
const TWO_SUM_CASE = [{ inputs: ['[2,7,11,15]', '9'], expectedOutput: '[0,1]' }];

const CORRECT = `class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, n in enumerate(nums):
            if target - n in seen:
                return [seen[target - n], i]
            seen[n] = i
        return []`;

describe('runPythonCode: grading still works through the sandbox', () => {
    it('passes a correct solution', async () => {
        const [result] = await runPythonCode(CORRECT, TWO_SUM_CASE, TWO_SUM_TYPES);
        assert.equal(result.passed, true, result.error || '');
        assert.deepEqual(result.actualOutput, [0, 1]);
        assert.equal(result.error, null);
    });

    it('fails a wrong solution without calling it an error', async () => {
        const [result] = await runPythonCode(
            'class Solution:\n    def twoSum(self, nums, target):\n        return [9, 9]',
            TWO_SUM_CASE,
            TWO_SUM_TYPES,
        );
        assert.equal(result.passed, false);
        assert.deepEqual(result.actualOutput, [9, 9]);
    });

    it('surfaces the submission\'s own exception', async () => {
        const [result] = await runPythonCode(
            'class Solution:\n    def twoSum(self, nums, target):\n        raise ValueError("nope")',
            TWO_SUM_CASE,
            TWO_SUM_TYPES,
        );
        assert.equal(result.passed, false);
        assert.match(result.error || '', /nope/);
    });

    it('returns one result per test case', async () => {
        const results = await runPythonCode(CORRECT, [
            { inputs: ['[2,7,11,15]', '9'], expectedOutput: '[0,1]' },
            { inputs: ['[3,2,4]', '6'], expectedOutput: '[1,2]' },
        ], TWO_SUM_TYPES);
        assert.equal(results.length, 2);
        assert.ok(results.every((r) => r.passed), JSON.stringify(results));
    });

    it('cancels a disconnected request rather than grading or continuing its remaining cases', async () => {
        const signal = AbortSignal.timeout(100);
        await assert.rejects(runPythonCode(
            'class Solution:\n    def twoSum(self, nums, target):\n        while True: pass',
            [...TWO_SUM_CASE, ...TWO_SUM_CASE], TWO_SUM_TYPES, { signal },
        ), error => error.name === 'TimeoutError');
        const [result] = await runPythonCode(CORRECT, TWO_SUM_CASE, TWO_SUM_TYPES);
        assert.equal(result.passed, true, 'cancelled execution releases admission');
    });
});

describe('runPythonCode: hostile submissions', () => {
    it('blocks a submission that reaches for the filesystem', async () => {
        const [result] = await runPythonCode(
            'import os\nclass Solution:\n    def twoSum(self, nums, target):\n        return os.listdir("/")',
            TWO_SUM_CASE,
            TWO_SUM_TYPES,
        );
        assert.equal(result.passed, false);
        assert.match(result.error || '', /blocked by the execution sandbox/);
    });

    it('blocks a submission that reaches for the network', async () => {
        const [result] = await runPythonCode(
            'import socket\nclass Solution:\n    def twoSum(self, nums, target):\n        return []',
            TWO_SUM_CASE,
            TWO_SUM_TYPES,
        );
        assert.equal(result.passed, false);
        assert.match(result.error || '', /blocked by the execution sandbox/);
    });

    it('terminates an infinite loop and reports it as a timeout', async () => {
        const [result] = await runPythonCode(
            'class Solution:\n    def twoSum(self, nums, target):\n        while True: pass',
            TWO_SUM_CASE,
            TWO_SUM_TYPES,
        );
        assert.equal(result.passed, false);
        assert.equal(result.status, 'tle');
        assert.match(result.error || '', /time limit exceeded/i);
    });
});
