# @solution memoized-position-sum accept
from functools import lru_cache

class Solution:
    def findTargetSumWays(self, nums, target):
        @lru_cache(None)
        def count(i, total):
            if i == len(nums):
                return int(total == target)
            return count(i + 1, total + nums[i]) + count(i + 1, total - nums[i])
        return count(0, 0)

# @solution subset-sum-count-dp accept
class Solution:
    def findTargetSumWays(self, nums, target):
        total = sum(nums)
        if abs(target) > total or (total + target) % 2:
            return 0
        wanted = (total + target) // 2
        ways = [0] * (wanted + 1)
        ways[0] = 1
        for value in nums:
            for subtotal in range(wanted, value - 1, -1):
                ways[subtotal] += ways[subtotal - value]
        return ways[wanted]
