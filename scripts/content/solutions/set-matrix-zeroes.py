# @solution first-row-and-column-markers accept
from typing import List

class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> List[List[int]]:
        rows, cols = len(matrix), len(matrix[0])
        first_row_zero = any(matrix[0][c] == 0 for c in range(cols))
        first_col_zero = any(matrix[r][0] == 0 for r in range(rows))
        for r in range(1, rows):
            for c in range(1, cols):
                if matrix[r][c] == 0:
                    matrix[r][0] = matrix[0][c] = 0
        for r in range(1, rows):
            for c in range(1, cols):
                if matrix[r][0] == 0 or matrix[0][c] == 0:
                    matrix[r][c] = 0
        if first_row_zero:
            matrix[0] = [0] * cols
        if first_col_zero:
            for r in range(rows):
                matrix[r][0] = 0
        return matrix

# @solution row-and-column-sets accept
from typing import List

class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> List[List[int]]:
        if not matrix or not matrix[0]:
            return matrix
        zero_rows = {r for r, row in enumerate(matrix) if 0 in row}
        zero_cols = {c for c in range(len(matrix[0])) if any(matrix[r][c] == 0 for r in range(len(matrix)))}
        for r in range(len(matrix)):
            for c in range(len(matrix[0])):
                if r in zero_rows or c in zero_cols:
                    matrix[r][c] = 0
        return matrix

# @solution mutates-while-discovering reject
from typing import List

class Solution:
    def setZeroes(self, matrix: List[List[int]]) -> List[List[int]]:
        for r in range(len(matrix)):
            for c in range(len(matrix[0])):
                if matrix[r][c] == 0:
                    for j in range(len(matrix[0])): matrix[r][j] = 0
                    for i in range(len(matrix)): matrix[i][c] = 0
        return matrix
