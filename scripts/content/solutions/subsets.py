# @solution recursive-backtracking accept
from typing import List

class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        result, path = [], []
        def visit(index):
            if index == len(nums):
                result.append(path.copy())
                return
            visit(index + 1)
            path.append(nums[index])
            visit(index + 1)
            path.pop()
        visit(0)
        return result

# @solution iterative-power-set accept
from typing import List

class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        result = [[]]
        for value in nums:
            result += [subset + [value] for subset in result]
        return result

# @solution omits-empty-subset reject
from typing import List

class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        result = []
        for mask in range(1, 1 << len(nums)):
            result.append([nums[i] for i in range(len(nums)) if mask & (1 << i)])
        return result
