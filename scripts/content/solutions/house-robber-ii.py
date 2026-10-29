# @solution two-linear-ranges accept
class Solution:
    def rob(self, nums):
        if len(nums) == 1: return nums[0]
        def linear(start, end):
            prev2 = prev1 = 0
            for i in range(start, end):
                prev2, prev1 = prev1, max(prev1, prev2 + nums[i])
            return prev1
        return max(linear(0, len(nums) - 1), linear(1, len(nums)))

# @solution rolling-dp-exclusion accept
class Solution:
    def rob(self, nums):
        if len(nums) == 1: return nums[0]
        def solve(values):
            take = skip = 0
            for value in values:
                take, skip = skip + value, max(take, skip)
            return max(take, skip)
        return max(solve(nums[:-1]), solve(nums[1:]))

# @solution exponential-circular-recursion tle
class Solution:
    def rob(self, nums):
        def search(index, end):
            if index >= end: return 0
            return max(nums[index] + search(index + 2, end), search(index + 1, end))
        if len(nums) == 1: return nums[0]
        return max(search(0, len(nums) - 1), search(1, len(nums)))
