# @solution track-max-and-min accept
from typing import List

class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        high = low = answer = nums[0]
        for value in nums[1:]:
            if value < 0:
                high, low = low, high
            high = max(value, high * value)
            low = min(value, low * value)
            answer = max(answer, high)
        return answer

# @solution prefix-and-suffix-products accept
from typing import List

class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        answer = float('-inf')
        left = right = 1
        n = len(nums)
        for i in range(n):
            left = (left or 1) * nums[i]
            right = (right or 1) * nums[n - 1 - i]
            answer = max(answer, left, right)
        return answer

# @solution enumerate-all-products tle
from typing import List

class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        best = nums[0]
        for start in range(len(nums)):
            product = 1
            for end in range(start, len(nums)):
                product *= nums[end]
                best = max(best, product)
        return best

# @solution ignores-negative-prefix reject
from typing import List

class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        return max(nums)
