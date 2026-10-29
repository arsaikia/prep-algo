# @solution monotonic-deque accept
from collections import deque
from typing import List

class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        if not nums or k <= 0:
            return []
        queue = deque()
        result = []
        for i, value in enumerate(nums):
            while queue and queue[0] <= i - k:
                queue.popleft()
            while queue and nums[queue[-1]] <= value:
                queue.pop()
            queue.append(i)
            if i >= k - 1:
                result.append(nums[queue[0]])
        return result

# @solution lazy-max-heap accept
import heapq
from typing import List

class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        if not nums or k <= 0:
            return []
        heap = [(-nums[i], i) for i in range(min(k, len(nums)))]
        heapq.heapify(heap)
        result = [-heap[0][0]]
        for i in range(k, len(nums)):
            heapq.heappush(heap, (-nums[i], i))
            while heap[0][1] <= i - k:
                heapq.heappop(heap)
            result.append(-heap[0][0])
        return result

# @solution rescans-every-window tle
from typing import List

class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        if not nums or k <= 0:
            return []
        return [max(nums[i:i+k]) for i in range(len(nums) - k + 1)]

# @solution uses-minimum reject
from typing import List

class Solution:
    def maxSlidingWindow(self, nums: List[int], k: int) -> List[int]:
        return [min(nums[i:i+k]) for i in range(len(nums) - k + 1)] if k else []
