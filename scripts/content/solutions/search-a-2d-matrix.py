# @solution flattened-binary-search accept
from typing import List

class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        if not matrix or not matrix[0]:
            return False
        rows, cols = len(matrix), len(matrix[0])
        lo, hi = 0, rows * cols
        while lo < hi:
            mid = (lo + hi) // 2
            value = matrix[mid // cols][mid % cols]
            if value < target:
                lo = mid + 1
            else:
                hi = mid
        return lo < rows * cols and matrix[lo // cols][lo % cols] == target

# @solution staircase-search accept
from typing import List

class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        if not matrix or not matrix[0]:
            return False
        row, col = 0, len(matrix[0]) - 1
        while row < len(matrix) and col >= 0:
            if matrix[row][col] == target:
                return True
            if matrix[row][col] > target:
                col -= 1
            else:
                row += 1
        return False

# @solution searches-only-first-row reject
from typing import List

class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        return bool(matrix and target in matrix[0])
