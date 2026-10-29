# @solution multi-source-breadth-first-search accept
from collections import deque

class Solution:
    def wallsAndGates(self, rooms):
        if not rooms or not rooms[0]:
            return
        rows, cols = len(rooms), len(rooms[0])
        queue = deque((r, c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0)
        while queue:
            row, col = queue.popleft()
            for nr, nc in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
                if 0 <= nr < rows and 0 <= nc < cols and rooms[nr][nc] == 2147483647:
                    rooms[nr][nc] = rooms[row][col] + 1
                    queue.append((nr, nc))

# @solution multi-source-dijkstra accept
import heapq

class Solution:
    def wallsAndGates(self, rooms):
        if not rooms or not rooms[0]:
            return
        rows, cols = len(rooms), len(rooms[0])
        heap = [(0, r, c) for r in range(rows) for c in range(cols) if rooms[r][c] == 0]
        heapq.heapify(heap)
        while heap:
            distance, row, col = heapq.heappop(heap)
            if rooms[row][col] < distance:
                continue
            for nr, nc in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
                if 0 <= nr < rows and 0 <= nc < cols and rooms[nr][nc] == 2147483647:
                    rooms[nr][nc] = distance + 1
                    heapq.heappush(heap, (distance + 1, nr, nc))
