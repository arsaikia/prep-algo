# @solution boyer-moore accept
from typing import List

class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        candidate = None
        balance = 0
        for value in nums:
            if balance == 0:
                candidate = value
            balance += 1 if value == candidate else -1
        return candidate

# @solution frequency-count accept
from typing import List
from collections import Counter

class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        return max(Counter(nums), key=Counter(nums).get)

# @solution quadratic-count tle
from typing import List

class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        for value in nums:
            if sum(other == value for other in nums) > len(nums) // 2:
                return value

# @solution returns-first-element reject
from typing import List

class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        return nums[0]
