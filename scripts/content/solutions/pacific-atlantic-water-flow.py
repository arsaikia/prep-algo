# @solution reverse-border-breadth-first-search accept
from collections import deque
from typing import List

class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        if not heights or not heights[0]:
            return []
        rows, cols = len(heights), len(heights[0])
        def reach(starts):
            seen = set(starts)
            queue = deque(starts)
            while queue:
                r, c = queue.popleft()
                for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen and heights[nr][nc] >= heights[r][c]:
                        seen.add((nr, nc))
                        queue.append((nr, nc))
            return seen
        pacific = [(0, c) for c in range(cols)] + [(r, 0) for r in range(rows)]
        atlantic = [(rows - 1, c) for c in range(cols)] + [(r, cols - 1) for r in range(rows)]
        both = reach(pacific) & reach(atlantic)
        return [[r, c] for r in range(rows) for c in range(cols) if (r, c) in both]

# @solution reverse-border-depth-first-search accept
from typing import List

class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        if not heights or not heights[0]:
            return []
        m, n = len(heights), len(heights[0])
        def collect(starts):
            seen = set()
            stack = list(starts)
            while stack:
                r, c = stack.pop()
                if (r, c) in seen:
                    continue
                seen.add((r, c))
                for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                    if 0 <= nr < m and 0 <= nc < n and heights[nr][nc] >= heights[r][c] and (nr, nc) not in seen:
                        stack.append((nr, nc))
            return seen
        p = collect([(0, c) for c in range(n)] + [(r, 0) for r in range(m)])
        a = collect([(m - 1, c) for c in range(n)] + [(r, n - 1) for r in range(m)])
        return [[r, c] for r in range(m) for c in range(n) if (r, c) in p and (r, c) in a]

# @solution searches-outward-from-every-cell tle
from typing import List

class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        if not heights or not heights[0]:
            return []
        rows, cols = len(heights), len(heights[0])
        def reaches_both(start):
            stack = [start]
            seen = {start}
            pacific = atlantic = False
            while stack:
                r, c = stack.pop()
                pacific |= r == 0 or c == 0
                atlantic |= r == rows - 1 or c == cols - 1
                for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen and heights[nr][nc] <= heights[r][c]:
                        seen.add((nr, nc))
                        stack.append((nr, nc))
            return pacific and atlantic
        result = []
        for r in range(rows):
            for c in range(cols):
                if reaches_both((r, c)):
                    result.append([r, c])
        return result
