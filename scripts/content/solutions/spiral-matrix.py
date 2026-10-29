# @solution shrinking-boundaries accept
from typing import List

class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        if not matrix or not matrix[0]:
            return []
        top, bottom, left, right = 0, len(matrix) - 1, 0, len(matrix[0]) - 1
        result = []
        while top <= bottom and left <= right:
            result.extend(matrix[top][left:right + 1])
            top += 1
            for row in range(top, bottom + 1):
                result.append(matrix[row][right])
            right -= 1
            if top <= bottom:
                result.extend(reversed(matrix[bottom][left:right + 1]))
                bottom -= 1
            if left <= right:
                for row in range(bottom, top - 1, -1):
                    result.append(matrix[row][left])
                left += 1
        return result

# @solution directional-walk accept
from typing import List

class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        if not matrix or not matrix[0]:
            return []
        rows, cols = len(matrix), len(matrix[0])
        seen = [[False] * cols for _ in range(rows)]
        directions = ((0, 1), (1, 0), (0, -1), (-1, 0))
        r = c = direction = 0
        result = []
        for _ in range(rows * cols):
            result.append(matrix[r][c])
            seen[r][c] = True
            nr, nc = r + directions[direction][0], c + directions[direction][1]
            if not (0 <= nr < rows and 0 <= nc < cols) or seen[nr][nc]:
                direction = (direction + 1) % 4
                nr, nc = r + directions[direction][0], c + directions[direction][1]
            r, c = nr, nc
        return result

# @solution omits-single-row-column reject
from typing import List

class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        if not matrix or not matrix[0]: return []
        top, bottom, left, right = 0, len(matrix)-1, 0, len(matrix[0])-1
        out=[]
        while top < bottom and left < right:
            out.extend(matrix[top][left:right+1]); top += 1
            for r in range(top,bottom+1): out.append(matrix[r][right])
            right -= 1
            out.extend(reversed(matrix[bottom][left:right+1])); bottom -= 1
            for r in range(bottom,top-1,-1): out.append(matrix[r][left])
            left += 1
        return out
