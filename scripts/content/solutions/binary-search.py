# @solution iterative accept
from typing import List
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums)-1
        while lo <= hi:
            mid = (lo+hi)//2
            if nums[mid] == target: return mid
            if nums[mid] < target: lo = mid+1
            else: hi = mid-1
        return -1

# @solution recursive accept
from typing import List
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        def find(lo, hi):
            if lo > hi: return -1
            mid = (lo+hi)//2
            if nums[mid] == target: return mid
            return find(mid+1, hi) if nums[mid] < target else find(lo, mid-1)
        return find(0, len(nums)-1)
