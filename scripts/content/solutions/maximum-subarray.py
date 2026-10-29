# @solution kadane accept
from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        current = best = nums[0]
        for value in nums[1:]:
            current = max(value, current + value)
            best = max(best, current)
        return best

# @solution divide-and-conquer accept
from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        def solve(lo, hi):
            if lo == hi:
                return (nums[lo], nums[lo], nums[lo], nums[lo])
            mid = (lo + hi) // 2
            left = solve(lo, mid)
            right = solve(mid + 1, hi)
            total = left[0] + right[0]
            prefix = max(left[1], left[0] + right[1])
            suffix = max(right[2], right[0] + left[2])
            best = max(left[3], right[3], left[2] + right[1])
            return total, prefix, suffix, best
        return solve(0, len(nums) - 1)[3]

# @solution enumerate-all-subarrays tle
from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        best = nums[0]
        for start in range(len(nums)):
            total = 0
            for end in range(start, len(nums)):
                total += nums[end]
                best = max(best, total)
        return best

# @solution returns-largest-single-value reject
from typing import List

class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        return max(nums)
