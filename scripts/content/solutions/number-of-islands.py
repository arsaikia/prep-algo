# @solution iterative-depth-first-search accept
from typing import List

class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        if not grid or not grid[0]:
            return 0
        rows, cols = len(grid), len(grid[0])
        seen = set()
        islands = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != "1" or (r, c) in seen:
                    continue
                islands += 1
                seen.add((r, c))
                stack = [(r, c)]
                while stack:
                    x, y = stack.pop()
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == "1" and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
        return islands

# @solution breadth-first-search accept
from collections import deque
from typing import List

class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        if not grid or not grid[0]:
            return 0
        rows, cols = len(grid), len(grid[0])
        seen = set()
        count = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != "1" or (r, c) in seen:
                    continue
                count += 1
                seen.add((r, c))
                queue = deque([(r, c)])
                while queue:
                    x, y = queue.popleft()
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        if 0 <= nx < rows and 0 <= ny < cols and grid[nx][ny] == "1" and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            queue.append((nx, ny))
        return count

# @solution connects-diagonals reject
from typing import List

class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        if not grid or not grid[0]:
            return 0
        rows, cols = len(grid), len(grid[0])
        seen = set()
        count = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "1" and (r, c) not in seen:
                    count += 1
                    stack = [(r, c)]
                    seen.add((r, c))
                    while stack:
                        x, y = stack.pop()
                        for nx in range(max(0, x - 1), min(rows, x + 2)):
                            for ny in range(max(0, y - 1), min(cols, y + 2)):
                                if grid[nx][ny] == "1" and (nx, ny) not in seen:
                                    seen.add((nx, ny))
                                    stack.append((nx, ny))
        return count
