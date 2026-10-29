# @solution min-max-dijkstra accept
import heapq
from typing import List

class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        heap = [(grid[0][0], 0, 0)]
        seen = {(0, 0)}
        while heap:
            level, r, c = heapq.heappop(heap)
            if r == n - 1 and c == n - 1:
                return level
            for nr, nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                if 0 <= nr < n and 0 <= nc < n and (nr,nc) not in seen:
                    seen.add((nr,nc))
                    heapq.heappush(heap, (max(level, grid[nr][nc]), nr, nc))
        return -1

# @solution threshold-binary-search-bfs accept
from collections import deque
from typing import List

class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        lo, hi = max(grid[0][0], grid[-1][-1]), n * n - 1
        def reachable(limit):
            if grid[0][0] > limit: return False
            q, seen = deque([(0,0)]), {(0,0)}
            while q:
                r,c = q.popleft()
                if (r,c) == (n-1,n-1): return True
                for nr,nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                    if 0<=nr<n and 0<=nc<n and (nr,nc) not in seen and grid[nr][nc] <= limit:
                        seen.add((nr,nc)); q.append((nr,nc))
            return False
        while lo < hi:
            mid = (lo + hi) // 2
            if reachable(mid): hi = mid
            else: lo = mid + 1
        return lo

# @solution enumerates-simple-paths tle
from typing import List

class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        visited = [[False] * n for _ in range(n)]
        answer = n * n
        def search(r, c, maximum):
            nonlocal answer
            maximum = max(maximum, grid[r][c])
            if maximum >= answer: return
            if (r,c) == (n-1,n-1):
                answer = maximum; return
            visited[r][c] = True
            for nr,nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                if 0<=nr<n and 0<=nc<n and not visited[nr][nc]:
                    search(nr,nc,maximum)
            visited[r][c] = False
        search(0,0,grid[0][0])
        return answer
