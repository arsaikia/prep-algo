# @solution dutch-national-flag accept
from typing import List

class Solution:
    def sortColors(self, nums: List[int]) -> List[int]:
        low, current, high = 0, 0, len(nums) - 1
        while current <= high:
            if nums[current] == 0:
                nums[low], nums[current] = nums[current], nums[low]
                low += 1
                current += 1
            elif nums[current] == 2:
                nums[current], nums[high] = nums[high], nums[current]
                high -= 1
            else:
                current += 1
        return nums

# @solution count-and-overwrite accept
from typing import List

class Solution:
    def sortColors(self, nums: List[int]) -> List[int]:
        counts = [0, 0, 0]
        for value in nums:
            counts[value] += 1
        index = 0
        for value, count in enumerate(counts):
            for _ in range(count):
                nums[index] = value
                index += 1
        return nums

# @solution swaps-two-before-increment reject
from typing import List

class Solution:
    def sortColors(self, nums: List[int]) -> List[int]:
        low, current, high = 0, 0, len(nums) - 1
        while current <= high:
            if nums[current] == 0:
                nums[low], nums[current] = nums[current], nums[low]
                low += 1
                current += 1
            elif nums[current] == 2:
                nums[current], nums[high] = nums[high], nums[current]
                current += 1
                high -= 1
            else:
                current += 1
        return nums
