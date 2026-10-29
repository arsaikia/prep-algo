# @solution xor-fold accept
from typing import List

class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        answer = 0
        for value in nums:
            answer ^= value
        return answer

# @solution frequency-count accept
from collections import Counter
from typing import List

class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        return next(value for value, count in Counter(nums).items() if count == 1)

# @solution returns-first-element reject
from typing import List

class Solution:
    def singleNumber(self, nums: List[int]) -> int:
        return nums[0]
