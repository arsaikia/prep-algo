# @solution iterative-flood-fill accept
class Solution:
    def countSubIslands(self, grid1, grid2):
        if not grid2 or not grid2[0]:
            return 0
        rows, cols = len(grid2), len(grid2[0])
        seen = set()
        total = 0
        for r in range(rows):
            for c in range(cols):
                if grid2[r][c] != 1 or (r, c) in seen:
                    continue
                stack = [(r, c)]
                seen.add((r, c))
                valid = True
                while stack:
                    x, y = stack.pop()
                    if grid1[x][y] != 1:
                        valid = False
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        if 0 <= nx < rows and 0 <= ny < cols and grid2[nx][ny] == 1 and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
                total += valid
        return total

# @solution component-validation-queue accept
class Solution:
    def countSubIslands(self, grid1, grid2):
        if not grid2 or not grid2[0]:
            return 0
        rows, cols = len(grid2), len(grid2[0])
        seen = [[False] * cols for _ in range(rows)]
        total = 0
        for r in range(rows):
            for c in range(cols):
                if not grid2[r][c] or seen[r][c]:
                    continue
                queue = [(r, c)]
                seen[r][c] = True
                head = 0
                valid = True
                while head < len(queue):
                    x, y = queue[head]
                    head += 1
                    if not grid1[x][y]:
                        valid = False
                    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                        if 0 <= nx < rows and 0 <= ny < cols and grid2[nx][ny] and not seen[nx][ny]:
                            seen[nx][ny] = True
                            queue.append((nx, ny))
                if valid:
                    total += 1
        return total
# @solution only-check-component-seed reject
class Solution:
    def countSubIslands(self, grid1, grid2):
        return sum(grid2[r][c] == 1 and grid1[r][c] == 1 for r in range(len(grid2)) for c in range(len(grid2[0])))

