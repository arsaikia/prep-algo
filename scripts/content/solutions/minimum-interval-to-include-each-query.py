# @solution sorted-queries-heap accept
from typing import List
import heapq

class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        intervals.sort()
        indexed = sorted((q, i) for i, q in enumerate(queries))
        heap = []
        answer = [-1] * len(queries)
        j = 0
        for q, i in indexed:
            while j < len(intervals) and intervals[j][0] <= q:
                left, right = intervals[j]
                heapq.heappush(heap, (right - left + 1, right))
                j += 1
            while heap and heap[0][1] < q:
                heapq.heappop(heap)
            if heap:
                answer[i] = heap[0][0]
        return answer

# @solution shortest-first-disjoint-query-assignment accept
from typing import List
import bisect

class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        ordered = sorted((q, i) for i, q in enumerate(queries))
        values = [q for q, _ in ordered]
        parent = list(range(len(values) + 1))
        def find(x):
            root = x
            while parent[root] != root:
                root = parent[root]
            while parent[x] != x:
                next_x = parent[x]
                parent[x] = root
                x = next_x
            return root
        answer = [-1] * len(queries)
        for left, right in sorted(intervals, key=lambda x: x[1] - x[0] + 1):
            i = find(bisect.bisect_left(values, left))
            while i < len(values) and values[i] <= right:
                answer[ordered[i][1]] = right - left + 1
                parent[i] = find(i + 1)
                i = parent[i]
        return answer

# @solution checks-only-last-interval reject
from typing import List

class Solution:
    def minInterval(self, intervals: List[List[int]], queries: List[int]) -> List[int]:
        return [next((r - l + 1 for l, r in intervals if l <= q <= r), -1) for q in queries]
