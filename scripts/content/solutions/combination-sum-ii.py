# @solution sorted-backtracking accept
from typing import List
class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        nums = sorted(candidates); result = []; path = []
        def visit(start, remaining):
            if remaining == 0: result.append(path[:]); return
            for i in range(start,len(nums)):
                if i > start and nums[i] == nums[i-1]: continue
                if nums[i] > remaining: break
                path.append(nums[i]); visit(i+1, remaining-nums[i]); path.pop()
        visit(0,target); return result

# @solution frequency-count-recursion accept
from typing import List
from collections import Counter
class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        counts = sorted(Counter(candidates).items()); result = []; path = []
        def choose(i, remaining):
            if remaining == 0: result.append(path[:]); return
            if i == len(counts): return
            value, frequency = counts[i]
            for used in range(min(frequency, remaining // value) + 1):
                choose(i+1, remaining-used*value)
                path.append(value)
            for _ in range(min(frequency, remaining // value) + 1): path.pop()
        choose(0,target); return result
