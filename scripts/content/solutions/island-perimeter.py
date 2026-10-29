# @solution count-water-facing-sides accept
class Solution:
    def islandPerimeter(self, grid):
        if not grid: return 0
        rows, cols = len(grid), len(grid[0])
        perimeter = 0
        for r in range(rows):
            for c in range(cols):
                if not grid[r][c]: continue
                perimeter += 4
                if r and grid[r - 1][c]: perimeter -= 2
                if c and grid[r][c - 1]: perimeter -= 2
        return perimeter

# @solution inspect-four-neighbors accept
class Solution:
    def islandPerimeter(self, grid):
        if not grid: return 0
        rows, cols = len(grid), len(grid[0])
        perimeter = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c]:
                    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nr, nc = r + dr, c + dc
                        if not (0 <= nr < rows and 0 <= nc < cols) or not grid[nr][nc]: perimeter += 1
        return perimeter
