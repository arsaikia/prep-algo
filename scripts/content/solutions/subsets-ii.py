# @solution sorted-backtracking accept
from typing import List

class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        nums.sort()
        result, path = [], []
        def visit(start):
            result.append(path.copy())
            for i in range(start, len(nums)):
                if i > start and nums[i] == nums[i - 1]:
                    continue
                path.append(nums[i])
                visit(i + 1)
                path.pop()
        visit(0)
        return result

# @solution iterative-deduplicated-expansion accept
from typing import List

class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        nums.sort()
        result = [[]]
        previous_size = 0
        for i, value in enumerate(nums):
            start = previous_size if i and nums[i] == nums[i - 1] else 0
            previous_size = len(result)
            result.extend(subset + [value] for subset in result[start:])
        return result

# @solution does-not-skip-equal-siblings reject
from typing import List

class Solution:
    def subsetsWithDup(self, nums: List[int]) -> List[List[int]]:
        result, path = [], []
        def visit(i):
            if i == len(nums):
                result.append(path.copy()); return
            visit(i+1)
            path.append(nums[i]); visit(i+1); path.pop()
        visit(0)
        return result
