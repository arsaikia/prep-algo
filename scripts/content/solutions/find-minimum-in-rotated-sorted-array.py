# @solution binary-search-pivot accept
class Solution:
    def findMin(self, nums):
        lo, hi = 0, len(nums) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if nums[mid] > nums[hi]: lo = mid + 1
            else: hi = mid
        return nums[lo]

# @solution linear-scan accept
class Solution:
    def findMin(self, nums):
        return min(nums)
