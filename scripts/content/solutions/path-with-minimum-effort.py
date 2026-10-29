# @solution dijkstra-minimax-path accept
import heapq
from typing import List

class Solution:
    def minimumEffortPath(self, heights: List[List[int]]) -> int:
        rows, cols = len(heights), len(heights[0])
        best = [[float('inf')] * cols for _ in range(rows)]
        best[0][0] = 0
        heap = [(0, 0, 0)]
        while heap:
            effort, r, c = heapq.heappop(heap)
            if (r, c) == (rows - 1, cols - 1):
                return effort
            if effort != best[r][c]:
                continue
            for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                if 0 <= nr < rows and 0 <= nc < cols:
                    candidate = max(effort, abs(heights[nr][nc] - heights[r][c]))
                    if candidate < best[nr][nc]:
                        best[nr][nc] = candidate
                        heapq.heappush(heap, (candidate, nr, nc))
        return 0

# @solution binary-search-effort-with-bfs accept
from collections import deque
from typing import List

class Solution:
    def minimumEffortPath(self, heights: List[List[int]]) -> int:
        rows, cols = len(heights), len(heights[0])
        def reachable(limit):
            seen = {(0, 0)}
            queue = deque([(0, 0)])
            while queue:
                r, c = queue.popleft()
                if (r, c) == (rows - 1, cols - 1):
                    return True
                for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen and abs(heights[nr][nc] - heights[r][c]) <= limit:
                        seen.add((nr, nc))
                        queue.append((nr, nc))
            return False
        low, high = 0, 1_000_000
        while low < high:
            mid = (low + high) // 2
            if reachable(mid):
                high = mid
            else:
                low = mid + 1
        return low
