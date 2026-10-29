# @solution greedy-by-end accept
from typing import List

class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        intervals.sort(key=lambda x: x[1])
        kept = 0
        end = float('-inf')
        for start, finish in intervals:
            if start >= end:
                kept += 1
                end = finish
        return len(intervals) - kept

# @solution greedy-by-start accept
from typing import List

class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        intervals.sort()
        removals = 0
        end = float('-inf')
        for start, finish in intervals:
            if start >= end:
                end = finish
            else:
                removals += 1
                end = min(end, finish)
        return removals

# @solution quadratic-dynamic-programming tle
from typing import List

class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        intervals.sort(key=lambda x: x[1])
        dp = [1] * len(intervals)
        for i in range(len(intervals)):
            for j in range(i):
                if intervals[j][1] <= intervals[i][0]:
                    dp[i] = max(dp[i], dp[j] + 1)
        return len(intervals) - max(dp, default=0)

# @solution assumes-no-removals reject
from typing import List

class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        return 0
