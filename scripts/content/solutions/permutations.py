# @solution backtracking-sorted-input accept
from typing import List

class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        nums = sorted(nums)
        result, path = [], []
        used = [False] * len(nums)
        def visit():
            if len(path) == len(nums):
                result.append(path.copy())
                return
            for i, value in enumerate(nums):
                if not used[i]:
                    used[i] = True
                    path.append(value)
                    visit()
                    path.pop()
                    used[i] = False
        visit()
        return result

# @solution itertools-lexicographic-permutations accept
from itertools import permutations
from typing import List

class Solution:
    def permute(self, nums: List[int]) -> List[List[int]]:
        return [list(p) for p in permutations(sorted(nums))]
