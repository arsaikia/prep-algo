# @solution xor-all-indices accept
from typing import List

class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        missing = len(nums)
        for i, value in enumerate(nums):
            missing ^= i ^ value
        return missing

# @solution arithmetic-sum accept
from typing import List

class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        n = len(nums)
        return n * (n + 1) // 2 - sum(nums)

# @solution assumes-missing-zero reject
from typing import List

class Solution:
    def missingNumber(self, nums: List[int]) -> int:
        return 0
