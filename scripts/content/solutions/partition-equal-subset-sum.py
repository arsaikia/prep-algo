# @solution integer-bitset-dynamic-programming accept
from typing import List

class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        target = total // 2
        possible = 1
        for value in nums:
            possible |= possible << value
        return bool((possible >> target) & 1)

# @solution set-of-reachable-sums accept
from typing import List

class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        target = total // 2
        sums = {0}
        for value in nums:
            sums |= {current + value for current in sums if current + value <= target}
        return target in sums

# @solution enumerates-all-subsets tle
from typing import List

class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2:
            return False
        target = total // 2
        def search(index, current):
            if index == len(nums):
                return current == target
            return search(index + 1, current) or search(index + 1, current + nums[index])
        return search(0, 0)
