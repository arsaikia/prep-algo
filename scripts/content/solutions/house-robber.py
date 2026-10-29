# @solution rolling-two-state-dp accept
class Solution:
    def rob(self, nums):
        two_back = one_back = 0
        for value in nums:
            two_back, one_back = one_back, max(one_back, two_back + value)
        return one_back

# @solution take-skip-state-dp accept
class Solution:
    def rob(self, nums):
        take = skip = 0
        for value in nums:
            take, skip = skip + value, max(take, skip)
        return max(take, skip)

# @solution exponential-recursion tle
class Solution:
    def rob(self, nums):
        def search(index):
            if index >= len(nums): return 0
            return max(nums[index] + search(index + 2), search(index + 1))
        return search(0)
