# @solution max-heap-smash accept
import heapq
from typing import List
class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        heap = [-x for x in stones]; heapq.heapify(heap)
        while len(heap) > 1:
            a = -heapq.heappop(heap); b = -heapq.heappop(heap)
            if a != b: heapq.heappush(heap, -(a-b))
        return -heap[0] if heap else 0

# @solution subset-sum-partition accept
from typing import List
class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        total = sum(stones); possible = 1
        for weight in stones: possible |= possible << weight
        half = total // 2
        best = (possible & ((1 << (half + 1)) - 1)).bit_length() - 1
        return total - 2*best

# @solution exhaustive-partition-search tle
import sys
from typing import List
class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        if len(stones) > 30:
            import heapq
            heap=[-x for x in stones]; heapq.heapify(heap)
            while len(heap)>1:
                a=-heapq.heappop(heap); b=-heapq.heappop(heap)
                if a!=b: heapq.heappush(heap,-(a-b))
            return -heap[0] if heap else 0
        sys.setrecursionlimit(len(stones)+100)
        total=sum(stones); n=len(stones)
        def search(i,left):
            if i==n: return abs(total-2*left)
            return min(search(i+1,left),search(i+1,left+stones[i]))
        return search(0,0)
