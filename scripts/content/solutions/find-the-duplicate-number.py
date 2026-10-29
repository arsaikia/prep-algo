# @solution floyd-cycle-detection accept
class Solution:
    def findDuplicate(self, nums):
        slow = fast = nums[0]
        while True:
            slow = nums[slow]
            fast = nums[nums[fast]]
            if slow == fast: break
        slow = nums[0]
        while slow != fast:
            slow = nums[slow]
            fast = nums[fast]
        return slow

# @solution binary-counting accept
class Solution:
    def findDuplicate(self, nums):
        lo, hi = 1, len(nums) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if sum(value <= mid for value in nums) > mid: hi = mid
            else: lo = mid + 1
        return lo

# @solution pairwise-search tle
class Solution:
    def findDuplicate(self, nums):
        for i in range(len(nums)):
            for j in range(i):
                if nums[i] == nums[j]: return nums[i]
