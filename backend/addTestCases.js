import mongoose from 'mongoose';
import Question from './models/Question.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

const addTestCases = async () => {
    try {
        await connectDB();

        // Add test cases for Two Sum
        const twoSumQuestion = await Question.findOne({ link: 'two-sum/' });

        if (!twoSumQuestion) {
            console.log('Two Sum question not found');
            return;
        }

        console.log('Found Two Sum question:', twoSumQuestion.name);

        // Update with proper test cases
        const updatedQuestion = await Question.findByIdAndUpdate(
            twoSumQuestion._id,
            {
                description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example 1:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

Example 2:
Input: nums = [3,2,4], target = 6
Output: [1,2]

Example 3:
Input: nums = [3,3], target = 6
Output: [0,1]

Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
                exampleTestCases: [
                    {
                        inputs: ["[2,7,11,15]", "9"],
                        expectedOutput: "[0,1]",
                        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
                    },
                    {
                        inputs: ["[3,2,4]", "6"],
                        expectedOutput: "[1,2]",
                        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
                    },
                    {
                        inputs: ["[3,3]", "6"],
                        expectedOutput: "[0,1]",
                        explanation: "Because nums[0] + nums[1] == 6, we return [0, 1]."
                    }
                ],
                testCases: [
                    {
                        inputs: ["[2,7,11,15]", "9"],
                        expectedOutput: "[0,1]",
                        isHidden: false
                    },
                    {
                        inputs: ["[3,2,4]", "6"],
                        expectedOutput: "[1,2]",
                        isHidden: false
                    },
                    {
                        inputs: ["[3,3]", "6"],
                        expectedOutput: "[0,1]",
                        isHidden: false
                    },
                    {
                        inputs: ["[1,2,3,4,5]", "9"],
                        expectedOutput: "[3,4]",
                        isHidden: true
                    },
                    {
                        inputs: ["[0,4,3,0]", "0"],
                        expectedOutput: "[0,3]",
                        isHidden: true
                    }
                ],
                templates: {
                    python: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your solution here
        pass`,
                    javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // Write your solution here
};`
                }
            },
            { new: true }
        );

        console.log('Successfully updated Two Sum question with test cases');
        console.log('Example test cases:', updatedQuestion.exampleTestCases.length);
        console.log('Test cases:', updatedQuestion.testCases.length);

    } catch (error) {
        console.error('Error adding test cases:', error);
    } finally {
        mongoose.connection.close();
    }
};

addTestCases(); 