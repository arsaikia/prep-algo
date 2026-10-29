# @solution quickselect-iterative accept
from typing import List
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        target = len(nums) - k
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            pivot = nums[(lo + hi) // 2]
            i, j = lo, hi
            while i <= j:
                while nums[i] < pivot: i += 1
                while nums[j] > pivot: j -= 1
                if i <= j:
                    nums[i], nums[j] = nums[j], nums[i]
                    i += 1; j -= 1
            if target <= j: hi = j
            elif target >= i: lo = i
            else: return nums[target]
        return nums[target]

# @solution min-heap-of-k accept
import heapq
from typing import List
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        return heapq.nlargest(k, nums)[-1]

# @solution kth-smallest reject
from typing import List
class Solution:
    def findKthLargest(self, nums: List[int], k: int) -> int:
        return sorted(nums)[k - 1]
