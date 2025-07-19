import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from '../models/Question.js';
import { runPythonCode } from '../utils/codeExecution.js';
import { connectDB } from '../config/db.js';

dotenv.config();

// Test cases for different problem types
const problemTestCases = {
    // Array Problems
    'two-sum': {
        name: 'Two Sum',
        group: 'arrays',
        solutions: [
            {
                name: 'Hash Map Solution',
                code: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        hash_map = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in hash_map:
                return [hash_map[complement], i]
            hash_map[num] = i
        return []`,
                expectedResults: [
                    { input: ['[2,7,11,15]', '9'], expected: '[0,1]' },
                    { input: ['[3,2,4]', '6'], expected: '[1,2]' },
                    { input: ['[3,3]', '6'], expected: '[0,1]' }
                ]
            },
            {
                name: 'Brute Force Solution',
                code: `from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        for i in range(len(nums)):
            for j in range(i + 1, len(nums)):
                if nums[i] + nums[j] == target:
                    return [i, j]
        return []`,
                expectedResults: [
                    { input: ['[2,7,11,15]', '9'], expected: '[0,1]' },
                    { input: ['[3,2,4]', '6'], expected: '[1,2]' }
                ]
            }
        ]
    },
    'remove-duplicates-from-sorted-array': {
        name: 'Remove Duplicates from Sorted Array',
        group: 'arrays',
        solutions: [
            {
                name: 'Two Pointers Solution',
                code: `from typing import List

class Solution:
    def removeDuplicates(self, nums: List[int]) -> int:
        if not nums:
            return 0
        k = 1
        for i in range(1, len(nums)):
            if nums[i] != nums[i-1]:
                nums[k] = nums[i]
                k += 1
        return k`,
                expectedResults: [
                    { input: ['[1,1,2]'], expected: '2' },
                    { input: ['[0,0,1,1,1,2,2,3,3,4]'], expected: '5' }
                ]
            }
        ]
    },
    'maximum-subarray': {
        name: 'Maximum Subarray (Kadane\'s Algorithm)',
        group: 'arrays',
        solutions: [
            {
                name: 'Kadane\'s Algorithm',
                code: `from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        max_sum = nums[0]
        current_sum = nums[0]
        
        for num in nums[1:]:
            current_sum = max(num, current_sum + num)
            max_sum = max(max_sum, current_sum)
        
        return max_sum`,
                expectedResults: [
                    { input: ['[-2,1,-3,4,-1,2,1,-5,4]'], expected: '6' },
                    { input: ['[1]'], expected: '1' },
                    { input: ['[5,4,-1,7,8]'], expected: '23' }
                ]
            }
        ]
    },

    // Tree Problems - Comprehensive Test Suite
    'invert-binary-tree': {
        name: 'Invert Binary Tree',
        group: 'trees',
        solutions: [
            {
                name: 'Recursive Solution',
                code: `class Solution:
    def invertTree(self, root):
        if not root:
            return None
        
        # Swap left and right children
        root.left, root.right = root.right, root.left
        
        # Recursively invert left and right subtrees
        self.invertTree(root.left)
        self.invertTree(root.right)
        
        return root`,
                expectedResults: [
                    { input: ['[4,2,7,1,3,6,9]'], expected: '[4,7,2,9,6,3,1]' },
                    { input: ['[2,1,3]'], expected: '[2,3,1]' },
                    { input: ['[]'], expected: '[]' },
                    { input: ['[1]'], expected: '[1]' },
                    { input: ['[1,2]'], expected: '[1,null,2]' },
                    { input: ['[1,2,3,4,5,6,7]'], expected: '[1,3,2,7,6,5,4]' }
                ]
            },
            {
                name: 'Iterative Solution (BFS)',
                code: `from collections import deque

class Solution:
    def invertTree(self, root):
        if not root:
            return None
        
        queue = deque([root])
        
        while queue:
            node = queue.popleft()
            
            # Swap left and right children
            node.left, node.right = node.right, node.left
            
            # Add children to queue
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        
        return root`,
                expectedResults: [
                    { input: ['[4,2,7,1,3,6,9]'], expected: '[4,7,2,9,6,3,1]' },
                    { input: ['[2,1,3]'], expected: '[2,3,1]' },
                    { input: ['[]'], expected: '[]' }
                ]
            }
        ]
    },
    'maximum-depth-of-binary-tree': {
        name: 'Maximum Depth of Binary Tree',
        group: 'trees',
        solutions: [
            {
                name: 'Recursive DFS',
                code: `class Solution:
    def maxDepth(self, root):
        if not root:
            return 0
        
        left_depth = self.maxDepth(root.left)
        right_depth = self.maxDepth(root.right)
        
        return max(left_depth, right_depth) + 1`,
                expectedResults: [
                    { input: ['[3,9,20,null,null,15,7]'], expected: '3' },
                    { input: ['[1,null,2]'], expected: '2' },
                    { input: ['[]'], expected: '0' },
                    { input: ['[1]'], expected: '1' },
                    { input: ['[1,2,3,4,5,6,7]'], expected: '3' },
                    { input: ['[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]'], expected: '4' }
                ]
            },
            {
                name: 'Iterative BFS',
                code: `from collections import deque

class Solution:
    def maxDepth(self, root):
        if not root:
            return 0
        
        queue = deque([(root, 1)])
        max_depth = 0
        
        while queue:
            node, depth = queue.popleft()
            max_depth = max(max_depth, depth)
            
            if node.left:
                queue.append((node.left, depth + 1))
            if node.right:
                queue.append((node.right, depth + 1))
        
        return max_depth`,
                expectedResults: [
                    { input: ['[3,9,20,null,null,15,7]'], expected: '3' },
                    { input: ['[1,null,2]'], expected: '2' },
                    { input: ['[]'], expected: '0' }
                ]
            }
        ]
    },
    'diameter-of-binary-tree': {
        name: 'Diameter of Binary Tree',
        group: 'trees',
        solutions: [
            {
                name: 'DFS with Height Calculation',
                code: `class Solution:
    def diameterOfBinaryTree(self, root):
        self.max_diameter = 0
        
        def height(node):
            if not node:
                return 0
            
            left_height = height(node.left)
            right_height = height(node.right)
            
            # Update max diameter
            self.max_diameter = max(self.max_diameter, left_height + right_height)
            
            return max(left_height, right_height) + 1
        
        height(root)
        return self.max_diameter`,
                expectedResults: [
                    { input: ['[1,2,3,4,5]'], expected: '3' },
                    { input: ['[1,2]'], expected: '1' },
                    { input: ['[1]'], expected: '0' },
                    { input: ['[1,2,3]'], expected: '2' },
                    { input: ['[1,2,3,4,5,6,7]'], expected: '4' },
                    { input: ['[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]'], expected: '6' }
                ]
            }
        ]
    },
    'balanced-binary-tree': {
        name: 'Balanced Binary Tree',
        group: 'trees',
        solutions: [
            {
                name: 'Bottom-up DFS',
                code: `class Solution:
    def isBalanced(self, root):
        def check_height(node):
            if not node:
                return 0
            
            left_height = check_height(node.left)
            if left_height == -1:
                return -1
            
            right_height = check_height(node.right)
            if right_height == -1:
                return -1
            
            if abs(left_height - right_height) > 1:
                return -1
            
            return max(left_height, right_height) + 1
        
        return check_height(root) != -1`,
                expectedResults: [
                    { input: ['[3,9,20,null,null,15,7]'], expected: 'true' },
                    { input: ['[1,2,2,3,3,null,null,4,4]'], expected: 'false' },
                    { input: ['[]'], expected: 'true' },
                    { input: ['[1]'], expected: 'true' },
                    { input: ['[1,2,3,4,5,6,7]'], expected: 'true' },
                    { input: ['[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]'], expected: 'true' }
                ]
            }
        ]
    },
    'same-tree': {
        name: 'Same Tree',
        group: 'trees',
        solutions: [
            {
                name: 'Recursive Comparison',
                code: `class Solution:
    def isSameTree(self, p, q):
        if not p and not q:
            return True
        if not p or not q:
            return False
        if p.val != q.val:
            return False
        
        return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)`,
                expectedResults: [
                    { input: ['[1,2,3]', '[1,2,3]'], expected: 'true' },
                    { input: ['[1,2]', '[1,null,2]'], expected: 'false' },
                    { input: ['[1,2,1]', '[1,1,2]'], expected: 'false' },
                    { input: ['[]', '[]'], expected: 'true' },
                    { input: ['[1]', '[1]'], expected: 'true' },
                    { input: ['[1,2,3,4,5]', '[1,2,3,4,5]'], expected: 'true' }
                ]
            }
        ]
    },
    'subtree-of-another-tree': {
        name: 'Subtree of Another Tree',
        group: 'trees',
        solutions: [
            {
                name: 'Recursive with Helper',
                code: `class Solution:
    def isSubtree(self, root, subRoot):
        if not subRoot:
            return True
        if not root:
            return False
        
        # Check if current tree matches subRoot
        if self.isSameTree(root, subRoot):
            return True
        
        # Recursively check left and right subtrees
        return self.isSubtree(root.left, subRoot) or self.isSubtree(root.right, subRoot)
    
    def isSameTree(self, p, q):
        if not p and not q:
            return True
        if not p or not q:
            return False
        if p.val != q.val:
            return False
        
        return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)`,
                expectedResults: [
                    { input: ['[3,4,5,1,2]', '[4,1,2]'], expected: 'true' },
                    { input: ['[3,4,5,1,2,null,null,null,null,0]', '[4,1,2]'], expected: 'false' },
                    { input: ['[1,1]', '[1]'], expected: 'true' },
                    { input: ['[1,2,3]', '[1,2]'], expected: 'false' },
                    { input: ['[1,2,3,4,5,6,7]', '[2,4,5]'], expected: 'true' },
                    { input: ['[1,2,3,4,5,6,7]', '[2,4,6]'], expected: 'false' }
                ]
            }
        ]
    },
    'binary-tree-level-order-traversal': {
        name: 'Binary Tree Level Order Traversal',
        group: 'trees',
        solutions: [
            {
                name: 'BFS with Level Tracking',
                code: `from collections import deque

class Solution:
    def levelOrder(self, root):
        if not root:
            return []
        
        result = []
        queue = deque([root])
        
        while queue:
            level_size = len(queue)
            current_level = []
            
            for _ in range(level_size):
                node = queue.popleft()
                current_level.append(node.val)
                
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
            
            result.append(current_level)
        
        return result`,
                expectedResults: [
                    { input: ['[3,9,20,null,null,15,7]'], expected: '[[3],[9,20],[15,7]]' },
                    { input: ['[1]'], expected: '[[1]]' },
                    { input: ['[]'], expected: '[]' },
                    { input: ['[1,2,3,4,5,6,7]'], expected: '[[1],[2,3],[4,5,6,7]]' },
                    { input: ['[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]'], expected: '[[1],[2,3],[4,5,6,7],[8,9,10,11,12,13,14,15]]' },
                    { input: ['[1,null,2,null,3]'], expected: '[[1],[2],[3]]' }
                ]
            }
        ]
    },
    'validate-binary-search-tree': {
        name: 'Validate Binary Search Tree',
        group: 'trees',
        solutions: [
            {
                name: 'Inorder Traversal',
                code: `class Solution:
    def isValidBST(self, root):
        self.prev = float('-inf')
        
        def inorder(node):
            if not node:
                return True
            
            if not inorder(node.left):
                return False
            
            if node.val <= self.prev:
                return False
            
            self.prev = node.val
            return inorder(node.right)
        
        return inorder(root)`,
                expectedResults: [
                    { input: ['[2,1,3]'], expected: 'true' },
                    { input: ['[5,1,4,null,null,3,6]'], expected: 'false' },
                    { input: ['[1]'], expected: 'true' },
                    { input: ['[1,1]'], expected: 'false' },
                    { input: ['[5,1,7,null,null,6,8]'], expected: 'true' },
                    { input: ['[5,1,7,null,null,6,4]'], expected: 'false' }
                ]
            },
            {
                name: 'Recursive with Bounds',
                code: `class Solution:
    def isValidBST(self, root):
        def isValid(node, min_val, max_val):
            if not node:
                return True
            
            if node.val <= min_val or node.val >= max_val:
                return False
            
            return (isValid(node.left, min_val, node.val) and 
                    isValid(node.right, node.val, max_val))
        
        return isValid(root, float('-inf'), float('inf'))`,
                expectedResults: [
                    { input: ['[2,1,3]'], expected: 'true' },
                    { input: ['[5,1,4,null,null,3,6]'], expected: 'false' },
                    { input: ['[1]'], expected: 'true' }
                ]
            }
        ]
    },
    'binary-tree-right-side-view': {
        name: 'Binary Tree Right Side View',
        group: 'trees',
        solutions: [
            {
                name: 'BFS Level Order',
                code: `from collections import deque

class Solution:
    def rightSideView(self, root):
        if not root:
            return []
        
        result = []
        queue = deque([root])
        
        while queue:
            level_size = len(queue)
            
            for i in range(level_size):
                node = queue.popleft()
                
                # Add rightmost node of each level
                if i == level_size - 1:
                    result.append(node.val)
                
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
        
        return result`,
                expectedResults: [
                    { input: ['[1,2,3,null,5,null,4]'], expected: '[1,3,4]' },
                    { input: ['[1,null,3]'], expected: '[1,3]' },
                    { input: ['[]'], expected: '[]' },
                    { input: ['[1,2,3,4,5,6,7]'], expected: '[1,3,7]' },
                    { input: ['[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]'], expected: '[1,3,7,15]' },
                    { input: ['[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]'], expected: '[1,3,7,15,31]' }
                ]
            }
        ]
    },
    'count-good-nodes-in-binary-tree': {
        name: 'Count Good Nodes In Binary Tree',
        group: 'trees',
        solutions: [
            {
                name: 'DFS with Path Maximum',
                code: `class Solution:
    def goodNodes(self, root):
        def dfs(node, max_val):
            if not node:
                return 0
            
            count = 0
            if node.val >= max_val:
                count = 1
            
            new_max = max(max_val, node.val)
            count += dfs(node.left, new_max)
            count += dfs(node.right, new_max)
            
            return count
        
        return dfs(root, float('-inf'))`,
                expectedResults: [
                    { input: ['[3,1,4,3,null,1,5]'], expected: '4' },
                    { input: ['[3,3,null,4,2]'], expected: '3' },
                    { input: ['[1]'], expected: '1' },
                    { input: ['[1,2,3,4,5,6,7]'], expected: '7' },
                    { input: ['[5,1,7,2,3,6,8]'], expected: '3' },
                    { input: ['[10,5,15,3,7,12,18]'], expected: '3' }
                ]
            }
        ]
    },
    'binary-tree-maximum-path-sum': {
        name: 'Binary Tree Maximum Path Sum',
        group: 'trees',
        solutions: [
            {
                name: 'DFS with Path Tracking',
                code: `class Solution:
    def maxPathSum(self, root):
        self.max_sum = float('-inf')
        
        def dfs(node):
            if not node:
                return 0
            
            # Get max path sum from left and right subtrees
            left_sum = max(0, dfs(node.left))
            right_sum = max(0, dfs(node.right))
            
            # Update max sum including current node
            self.max_sum = max(self.max_sum, node.val + left_sum + right_sum)
            
            # Return max path sum that can be extended by parent
            return node.val + max(left_sum, right_sum)
        
        dfs(root)
        return self.max_sum`,
                expectedResults: [
                    { input: ['[1,2,3]'], expected: '6' },
                    { input: ['[-10,9,20,null,null,15,7]'], expected: '42' },
                    { input: ['[2,-1]'], expected: '2' },
                    { input: ['[-3]'], expected: '-3' },
                    { input: ['[1,-2,3]'], expected: '4' },
                    { input: ['[5,4,8,11,null,13,4,7,2,null,null,null,1]'], expected: '48' }
                ]
            }
        ]
    },
    'binary-tree-inorder-traversal': {
        name: 'Binary Tree Inorder Traversal',
        group: 'trees',
        solutions: [
            {
                name: 'Recursive Solution',
                code: `class Solution:
    def inorderTraversal(self, root):
        result = []
        
        def inorder(node):
            if not node:
                return
            
            inorder(node.left)
            result.append(node.val)
            inorder(node.right)
        
        inorder(root)
        return result`,
                expectedResults: [
                    { input: ['[1,null,2,3]'], expected: '[1,3,2]' },
                    { input: ['[]'], expected: '[]' },
                    { input: ['[1]'], expected: '[1]' },
                    { input: ['[1,2,3,4,5,6,7]'], expected: '[4,2,5,1,6,3,7]' },
                    { input: ['[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]'], expected: '[8,4,9,2,10,5,11,1,12,6,13,3,14,7,15]' },
                    { input: ['[1,null,2,null,3]'], expected: '[1,2,3]' }
                ]
            },
            {
                name: 'Iterative Solution',
                code: `class Solution:
    def inorderTraversal(self, root):
        result = []
        stack = []
        current = root
        
        while current or stack:
            while current:
                stack.append(current)
                current = current.left
            
            current = stack.pop()
            result.append(current.val)
            current = current.right
        
        return result`,
                expectedResults: [
                    { input: ['[1,null,2,3]'], expected: '[1,3,2]' },
                    { input: ['[]'], expected: '[]' },
                    { input: ['[1]'], expected: '[1]' }
                ]
            }
        ]
    },
    'kth-smallest-element-in-a-bst': {
        name: 'Kth Smallest Element In a BST',
        group: 'trees',
        solutions: [
            {
                name: 'Inorder Traversal',
                code: `class Solution:
    def kthSmallest(self, root, k):
        self.count = 0
        self.result = None
        
        def inorder(node):
            if not node or self.result is not None:
                return
            
            inorder(node.left)
            
            self.count += 1
            if self.count == k:
                self.result = node.val
                return
            
            inorder(node.right)
        
        inorder(root)
        return self.result`,
                expectedResults: [
                    { input: ['[3,1,4,null,2]', '1'], expected: '1' },
                    { input: ['[5,3,6,2,4,null,null,1]', '3'], expected: '3' },
                    { input: ['[1]', '1'], expected: '1' },
                    { input: ['[3,1,4,null,2]', '2'], expected: '2' },
                    { input: ['[5,3,6,2,4,null,null,1]', '5'], expected: '5' },
                    { input: ['[10,5,15,3,7,12,18]', '4'], expected: '10' }
                ]
            }
        ]
    },

    // Linked List Problems
    'reverse-linked-list': {
        name: 'Reverse Linked List',
        group: 'linked-lists',
        solutions: [
            {
                name: 'Iterative Solution',
                code: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def reverseList(self, head: ListNode) -> ListNode:
        prev = None
        current = head
        while current:
            next_temp = current.next
            current.next = prev
            prev = current
            current = next_temp
        return prev`,
                expectedResults: [
                    { input: ['[1,2,3,4,5]'], expected: '[5,4,3,2,1]' },
                    { input: ['[1,2]'], expected: '[2,1]' }
                ]
            }
        ]
    }
};

// Test a single solution
const testSolution = async (questionId, solution, testCases) => {
    console.log(`\n🧪 Testing: ${solution.name}`);
    console.log(`   Question: ${questionId}`);

    const results = [];

    for (const testCase of testCases) {
        try {
            console.log(`   📝 Test case: ${testCase.input.join(', ')} -> Expected: ${testCase.expected}`);

            const executionResults = await runPythonCode(solution.code, [{
                inputs: testCase.input,
                expectedOutput: testCase.expected
            }]);

            const result = executionResults[0];

            if (result.passed) {
                console.log(`   ✅ PASSED: Got ${result.actualOutput}`);
                results.push({ passed: true, testCase, result });
            } else {
                console.log(`   ❌ FAILED: Expected ${testCase.expected}, got ${result.actualOutput}`);
                if (result.error) {
                    console.log(`   🔍 Error: ${result.error}`);
                }
                results.push({ passed: false, testCase, result });
            }

            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
            console.log(`   💥 EXECUTION ERROR: ${error.message}`);
            results.push({ passed: false, testCase, error: error.message });

            // Add delay even on error
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    console.log(`   📊 Results: ${passedCount}/${totalCount} tests passed`);

    // Add delay between solutions
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        solutionName: solution.name,
        results,
        passedCount,
        totalCount,
        success: passedCount === totalCount
    };
};

// Test specific question
const testQuestion = async (questionId) => {
    const questionData = problemTestCases[questionId];
    if (!questionData) {
        console.log(`❌ Question "${questionId}" not found in test cases`);
        return;
    }

    console.log(`\n📋 Testing: ${questionData.name} (${questionId})`);
    console.log('─'.repeat(50));

    const questionResults = [];

    for (const solution of questionData.solutions) {
        const result = await testSolution(questionId, solution, solution.expectedResults);
        questionResults.push(result);
    }

    const questionPassed = questionResults.every(r => r.success);
    const totalTests = questionResults.reduce((sum, r) => sum + r.totalCount, 0);
    const totalPassed = questionResults.reduce((sum, r) => sum + r.passedCount, 0);

    console.log(`\n📈 ${questionData.name} Summary:`);
    console.log(`   Total solutions tested: ${questionData.solutions.length}`);
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed}/${totalTests}`);
    console.log(`   Status: ${questionPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

    return {
        questionId,
        questionName: questionData.name,
        group: questionData.group,
        results: questionResults,
        passed: questionPassed,
        totalTests,
        totalPassed
    };
};

// Test all questions in a group
const testGroup = async (groupName) => {
    const groupQuestions = Object.entries(problemTestCases)
        .filter(([_, data]) => data.group === groupName);

    if (groupQuestions.length === 0) {
        console.log(`❌ No questions found for group "${groupName}"`);
        console.log('Available groups: arrays, trees, linked-lists');
        return;
    }

    console.log(`\n📚 Testing Group: ${groupName.toUpperCase()}`);
    console.log('='.repeat(50));

    const groupResults = [];

    for (const [questionId, questionData] of groupQuestions) {
        const result = await testQuestion(questionId);
        if (result) {
            groupResults.push(result);
        }
    }

    // Print group summary
    const totalQuestions = groupResults.length;
    const passedQuestions = groupResults.filter(r => r.passed).length;
    const totalTests = groupResults.reduce((sum, r) => sum + r.totalTests, 0);
    const totalPassedTests = groupResults.reduce((sum, r) => sum + r.totalPassed, 0);

    console.log(`\n📊 ${groupName.toUpperCase()} GROUP SUMMARY`);
    console.log(`   Questions tested: ${totalQuestions}`);
    console.log(`   Questions passed: ${passedQuestions}/${totalQuestions}`);
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   Tests passed: ${totalPassedTests}/${totalTests}`);
    console.log(`   Success rate: ${((totalPassedTests / totalTests) * 100).toFixed(1)}%`);

    return groupResults;
};

// Test all questions
const testAllQuestions = async () => {
    try {
        console.log('🚀 PROBLEM SUBMISSION TEST SUITE');
        console.log('================================');

        await connectDB();
        console.log('✅ Connected to database');

        const overallResults = [];

        for (const [questionId, questionData] of Object.entries(problemTestCases)) {
            const result = await testQuestion(questionId);
            if (result) {
                overallResults.push(result);
            }
        }

        // Print final summary
        console.log('\n🎯 FINAL SUMMARY');
        console.log('================');

        const totalQuestions = overallResults.length;
        const passedQuestions = overallResults.filter(r => r.passed).length;
        const totalTests = overallResults.reduce((sum, r) => sum + r.totalTests, 0);
        const totalPassedTests = overallResults.reduce((sum, r) => sum + r.totalPassed, 0);

        console.log(`📊 Questions tested: ${totalQuestions}`);
        console.log(`✅ Questions passed: ${passedQuestions}/${totalQuestions}`);
        console.log(`📝 Total tests: ${totalTests}`);
        console.log(`✅ Tests passed: ${totalPassedTests}/${totalTests}`);
        console.log(`📈 Success rate: ${((totalPassedTests / totalTests) * 100).toFixed(1)}%`);

        // Group by problem type
        const groupStats = {};
        overallResults.forEach(result => {
            if (!groupStats[result.group]) {
                groupStats[result.group] = { total: 0, passed: 0, tests: 0, passedTests: 0 };
            }
            groupStats[result.group].total++;
            groupStats[result.group].tests += result.totalTests;
            groupStats[result.group].passedTests += result.totalPassed;
            if (result.passed) {
                groupStats[result.group].passed++;
            }
        });

        console.log('\n📚 BY PROBLEM TYPE:');
        Object.entries(groupStats).forEach(([group, stats]) => {
            console.log(`   ${group.toUpperCase()}: ${stats.passed}/${stats.total} questions, ${stats.passedTests}/${stats.tests} tests`);
        });

        if (passedQuestions === totalQuestions) {
            console.log('\n🎉 ALL QUESTIONS PASSED! 🎉');
            console.log('The problem submission system is working correctly.');
        } else {
            console.log('\n⚠️  SOME QUESTIONS FAILED');
            console.log('Check the detailed results above for issues.');

            // Show failed questions
            const failedQuestions = overallResults.filter(r => !r.passed);
            console.log('\n❌ Failed questions:');
            failedQuestions.forEach(q => {
                console.log(`   - ${q.questionName}: ${q.totalPassed}/${q.totalTests} tests passed`);
            });
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Database connection closed');
    }
};

// Parse command line arguments
const parseArgs = () => {
    const args = process.argv.slice(2);
    const options = {
        question: null,
        group: null,
        all: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--question':
            case '-q':
                options.question = args[i + 1];
                i++;
                break;
            case '--group':
            case '-g':
                options.group = args[i + 1];
                i++;
                break;
            case '--all':
            case '-a':
                options.all = true;
                break;
            case '--help':
            case '-h':
                console.log(`
Usage: node testProblemSubmissions.js [options]

Options:
  -q, --question <id>    Test specific question (e.g., two-sum)
  -g, --group <name>     Test all questions in a group (arrays, trees, linked-lists)
  -a, --all              Test all questions (default)
  -h, --help             Show this help message

Examples:
  node testProblemSubmissions.js --question two-sum
  node testProblemSubmissions.js --group arrays
  node testProblemSubmissions.js --all

Available questions: ${Object.keys(problemTestCases).join(', ')}
Available groups: arrays, trees, linked-lists
                `);
                process.exit(0);
        }
    }

    return options;
};

// Main execution
const main = async () => {
    const options = parseArgs();

    try {
        if (options.question) {
            await testQuestion(options.question);
        } else if (options.group) {
            await testGroup(options.group);
        } else {
            await testAllQuestions();
        }
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
};

// Run the tests
main()
    .then(() => {
        console.log('\n🏁 Problem submission tests completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Test suite failed:', error);
        process.exit(1);
    });

export { testAllQuestions, testQuestion, testGroup, testSolution }; 