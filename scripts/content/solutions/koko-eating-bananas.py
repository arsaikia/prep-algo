# @solution binary-search-speed accept
from typing import List
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        lo, hi = 1, max(piles)
        while lo < hi:
            mid = (lo + hi) // 2
            if sum((p + mid - 1) // mid for p in piles) <= h:
                hi = mid
            else:
                lo = mid + 1
        return lo

# @solution bisect-monotone-hours accept
from bisect import bisect_right
from typing import List
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        upper = max(piles)
        return upper - bisect_right(range(upper, 0, -1), h, key=lambda speed: sum((p + speed - 1) // speed for p in piles)) + 1

# @solution scans-every-speed tle
from typing import List
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        for speed in range(1, max(piles) + 1):
            if sum((p + speed - 1) // speed for p in piles) <= h:
                return speed
