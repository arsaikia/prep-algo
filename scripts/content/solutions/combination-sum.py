# @solution reuse-backtracking accept
from typing import List
class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        nums = sorted(set(candidates)); out = []; path = []
        def visit(start, remaining):
            if remaining == 0: out.append(path[:]); return
            for i in range(start,len(nums)):
                if nums[i] > remaining: break
                path.append(nums[i]); visit(i,remaining-nums[i]); path.pop()
        visit(0,target); return out

# @solution count-dp-paths accept
from typing import List
class Solution:
    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:
        nums = sorted(set(candidates)); ways = [[] for _ in range(target+1)]; ways[0] = [[]]
        for coin in nums:
            for total in range(coin,target+1):
                ways[total].extend(path+[coin] for path in ways[total-coin])
        return ways[target]
