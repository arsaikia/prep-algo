# @solution iterative-flood-fill accept
from typing import List

class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0]) if grid else 0
        seen = set()
        best = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 1 or (r, c) in seen:
                    continue
                stack = [(r, c)]
                seen.add((r, c))
                area = 0
                while stack:
                    x, y = stack.pop()
                    area += 1
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == 1 and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
                best = max(best, area)
        return best

# @solution iterative-marking-flood-fill accept
from typing import List
from collections import deque

class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        rows, cols = len(grid), len(grid[0]) if grid else 0
        best = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != 1:
                    continue
                grid[r][c] = 0
                queue = deque([(r, c)])
                area = 0
                while queue:
                    x, y = queue.popleft()
                    area += 1
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == 1:
                            grid[nx][ny] = 0
                            queue.append((nx, ny))
                best = max(best, area)
        return best

# @solution counts-only reject
from typing import List

class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        return sum(sum(row) for row in grid)
