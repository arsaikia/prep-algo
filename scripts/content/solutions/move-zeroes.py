# @solution two-pointer-swap-in-place accept
from typing import List

class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        left = 0
        for right in range(len(nums)):
            if nums[right] != 0:
                nums[left], nums[right] = nums[right], nums[left]
                left += 1

# @solution compact-then-fill-returning accept
from typing import List

class Solution:
    def moveZeroes(self, nums: List[int]) -> List[int]:
        write = 0
        for value in nums:
            if value != 0:
                nums[write] = value
                write += 1
        for i in range(write, len(nums)):
            nums[i] = 0
        return nums

# @solution bubble-zeros-right tle
from typing import List

class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        n = len(nums)
        for i in range(n):
            for j in range(n - 1 - i):
                if nums[j] == 0 and nums[j + 1] != 0:
                    nums[j], nums[j + 1] = nums[j + 1], nums[j]

# @solution new-list-without-mutation reject
from typing import List

class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        nums = [x for x in nums if x != 0] + [0] * nums.count(0)

# @solution sorts-instead-of-stable reject
from typing import List

class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        nums.sort(key=lambda x: (x == 0, x))
