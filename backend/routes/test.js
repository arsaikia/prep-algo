import express from 'express';
import { runPythonCode } from '../utils/codeExecution.js';

const router = express.Router();

// Test endpoint to verify the comparison logic
router.post('/comparison', async (req, res) => {
    try {
        const testCode = `
from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        hash_map = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in hash_map:
                return [hash_map[complement], i]
            hash_map[num] = i
        return []
`;

        const testCases = [
            {
                inputs: ["[2,7,11,15]", "9"],
                expectedOutput: "[0,1]"
            }
        ];

        console.log('=== BACKEND TEST ===');
        console.log('Test case:', testCases[0]);
        console.log('Expected output type:', typeof testCases[0].expectedOutput);

        const results = await runPythonCode(testCode, testCases);

        console.log('Results:', results);

        res.json({
            testCase: testCases[0],
            results: results,
            success: true
        });
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router; 