# @solution set-starts accept
from typing import List
class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        values = set(nums); best = 0
        for x in values:
            if x-1 not in values:
                y = x
                while y in values: y += 1
                best = max(best, y-x)
        return best

# @solution sort-and-scan accept
from typing import List
class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        if not nums: return 0
        ordered = sorted(set(nums)); best = run = 1
        for i in range(1,len(ordered)):
            if ordered[i] == ordered[i-1]+1: run += 1
            else: run = 1
            best = max(best,run)
        return best

# @solution grows-from-every-number tle
from typing import List
class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        best = 0
        for x in nums:
            y = x
            while y in nums: y += 1
            best = max(best,y-x)
        return best
