# @solution multi-source-bfs accept
from collections import deque
from typing import List

class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        if not grid or not grid[0]:
            return 0
        rows, cols = len(grid), len(grid[0])
        queue = deque()
        fresh = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 2:
                    queue.append((r, c))
                elif grid[r][c] == 1:
                    fresh += 1
        minutes = 0
        while queue and fresh:
            for _ in range(len(queue)):
                r, c = queue.popleft()
                for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                        grid[nr][nc] = 2
                        fresh -= 1
                        queue.append((nr, nc))
            minutes += 1
        return minutes if fresh == 0 else -1

# @solution simultaneous-layer-scan accept
from typing import List

class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        if not grid or not grid[0]:
            return 0
        rows, cols = len(grid), len(grid[0])
        elapsed = 0
        while True:
            newly_rotten = []
            for r in range(rows):
                for c in range(cols):
                    if grid[r][c] == 1 and any(
                        0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 2
                        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1))
                    ):
                        newly_rotten.append((r, c))
            if not newly_rotten:
                break
            for r, c in newly_rotten:
                grid[r][c] = 2
            elapsed += 1
        return -1 if any(1 in row for row in grid) else elapsed

# @solution spreads-diagonally reject
from collections import deque
from typing import List

class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        q = deque((r, c) for r, row in enumerate(grid) for c, v in enumerate(row) if v == 2)
        fresh = sum(v == 1 for row in grid for v in row)
        minutes = 0
        while q and fresh:
            for _ in range(len(q)):
                r, c = q.popleft()
                for nr, nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1),(r+1,c+1)):
                    if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] == 1:
                        grid[nr][nc] = 2
                        fresh -= 1
                        q.append((nr,nc))
            minutes += 1
        return minutes if not fresh else -1
