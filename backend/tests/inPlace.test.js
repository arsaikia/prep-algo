import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runPythonCode } from '../utils/codeExecution.js';

const IN_PLACE_TYPES = { inputs: ['ARRAY'], output: 'ARRAY', inPlace: true };
const CASES = [
    { inputs: ['[0,1,0,3,12]'], expectedOutput: '[1,3,12,0,0]' },
    { inputs: ['[1,2,3]'], expectedOutput: '[1,2,3]' },
];

const MUTATE_ONLY = `class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        left = 0
        for right in range(len(nums)):
            if nums[right] != 0:
                nums[left], nums[right] = nums[right], nums[left]
                left += 1
`;

const MUTATE_AND_RETURN = `${MUTATE_ONLY}        return nums
`;

const NO_OP = `class Solution:
    def moveZeroes(self, nums):
        pass
`;

describe('in-place problems', () => {
    it('grade the mutated input when the solution returns None', async () => {
        const results = await runPythonCode(MUTATE_ONLY, CASES, IN_PLACE_TYPES);
        assert.deepEqual(results.map((r) => r.passed), [true, true]);
    });

    it('still accept solutions that return the array', async () => {
        const results = await runPythonCode(MUTATE_AND_RETURN, CASES, IN_PLACE_TYPES);
        assert.deepEqual(results.map((r) => r.passed), [true, true]);
    });

    it('fail a solution that does not mutate the input', async () => {
        const results = await runPythonCode(NO_OP, CASES.slice(0, 1), IN_PLACE_TYPES);
        assert.equal(results[0].passed, false);
    });

    it('do not substitute the input for problems without the flag', async () => {
        const results = await runPythonCode(MUTATE_ONLY, CASES.slice(0, 1), {
            inputs: ['ARRAY'],
            output: 'ARRAY',
        });
        assert.equal(results[0].passed, false);
    });
});
