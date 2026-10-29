# @solution flood-island-then-bfs accept
from collections import deque
from typing import List

class Solution:
    def shortestBridge(self, grid: List[List[int]]) -> int:
        n, m = len(grid), len(grid[0])
        island = deque()
        found = False
        for r in range(n):
            if found: break
            for c in range(m):
                if grid[r][c] == 1:
                    stack = [(r, c)]
                    grid[r][c] = 2
                    while stack:
                        x, y = stack.pop()
                        island.append((x, y))
                        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                            if 0 <= nx < n and 0 <= ny < m and grid[nx][ny] == 1:
                                grid[nx][ny] = 2
                                stack.append((nx, ny))
                    found = True
                    break
        distance = 0
        while island:
            for _ in range(len(island)):
                r, c = island.popleft()
                for nr, nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                    if 0 <= nr < n and 0 <= nc < m:
                        if grid[nr][nc] == 1:
                            return distance
                        if grid[nr][nc] == 0:
                            grid[nr][nc] = 2
                            island.append((nr, nc))
            distance += 1
        return -1

# @solution simultaneous-island-expansion accept
from collections import deque
from typing import List

class Solution:
    def shortestBridge(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0])
        owner = [[0] * cols for _ in range(rows)]
        distance = [[0] * cols for _ in range(rows)]
        queue = deque()
        island_id = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 1 and owner[r][c] == 0:
                    island_id += 1
                    stack = [(r, c)]
                    owner[r][c] = island_id
                    while stack:
                        x, y = stack.pop()
                        queue.append((x, y))
                        for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
                            if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == 1 and owner[nx][ny] == 0:
                                owner[nx][ny] = island_id
                                stack.append((nx, ny))
        while queue:
            r, c = queue.popleft()
            for nr, nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                if 0 <= nr < rows and 0 <= nc < cols:
                    if owner[nr][nc] and owner[nr][nc] != owner[r][c]:
                        return distance[r][c] + distance[nr][nc]
                    if owner[nr][nc] == 0:
                        owner[nr][nc] = owner[r][c]
                        distance[nr][nc] = distance[r][c] + 1
                        queue.append((nr, nc))
        return -1

# @solution counts-flips-off-by-one reject
from collections import deque
from typing import List

class Solution:
    def shortestBridge(self, grid: List[List[int]]) -> int:
        n, m = len(grid), len(grid[0])
        q = deque()
        seen = set()
        for r in range(n):
            for c in range(m):
                if grid[r][c] == 1:
                    q.append((r,c)); seen.add((r,c))
        distance = 0
        while q:
            for _ in range(len(q)):
                r,c=q.popleft()
                for nr,nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                    if 0<=nr<n and 0<=nc<m and (nr,nc) not in seen:
                        if grid[nr][nc] == 1: return distance
                        seen.add((nr,nc)); q.append((nr,nc))
            distance += 1
        return -1
