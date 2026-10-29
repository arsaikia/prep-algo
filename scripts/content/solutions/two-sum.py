# @solution one-pass-complement-map accept
class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for index, value in enumerate(nums):
            complement = target - value
            if complement in seen:
                return [seen[complement], index]
            seen[value] = index

# @solution sorted-values-two-pointer accept
class Solution:
    def twoSum(self, nums, target):
        ordered = sorted((value, index) for index, value in enumerate(nums))
        left, right = 0, len(ordered) - 1
        while left < right:
            total = ordered[left][0] + ordered[right][0]
            if total == target:
                return sorted([ordered[left][1], ordered[right][1]])
            if total < target:
                left += 1
            else:
                right -= 1
