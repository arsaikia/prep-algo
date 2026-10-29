# @solution inward-two-pointer-search accept
class Solution:
    def twoSum(self, numbers, target):
        left, right = 0, len(numbers) - 1
        while left < right:
            total = numbers[left] + numbers[right]
            if total == target:
                return [left + 1, right + 1]
            if total < target:
                left += 1
            else:
                right -= 1

# @solution binary-search-complement accept
from bisect import bisect_left

class Solution:
    def twoSum(self, numbers, target):
        for i, value in enumerate(numbers):
            j = bisect_left(numbers, target - value, i + 1)
            if j < len(numbers) and numbers[j] == target - value:
                return [i + 1, j + 1]

# @solution all-index-pairs-search tle
class Solution:
    def twoSum(self, numbers, target):
        for left in range(len(numbers)):
            for right in range(left + 1, len(numbers)):
                if numbers[left] + numbers[right] == target:
                    return [left + 1, right + 1]
