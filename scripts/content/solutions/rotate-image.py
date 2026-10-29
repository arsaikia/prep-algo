# @solution transpose-and-reverse-rows accept
from typing import List

class Solution:
    def rotate(self, matrix: List[List[int]]) -> List[List[int]]:
        n = len(matrix)
        for row in range(n):
            for col in range(row + 1, n):
                matrix[row][col], matrix[col][row] = matrix[col][row], matrix[row][col]
        for row in matrix:
            row.reverse()
        return matrix

# @solution four-way-layer-cycles accept
from typing import List

class Solution:
    def rotate(self, matrix: List[List[int]]) -> List[List[int]]:
        n = len(matrix)
        for layer in range(n // 2):
            last = n - 1 - layer
            for col in range(layer, last):
                offset = col - layer
                top = matrix[layer][col]
                matrix[layer][col] = matrix[last - offset][layer]
                matrix[last - offset][layer] = matrix[last][last - offset]
                matrix[last][last - offset] = matrix[col][last]
                matrix[col][last] = top
        return matrix

# @solution rotates-counterclockwise reject
from typing import List

class Solution:
    def rotate(self, matrix: List[List[int]]) -> List[List[int]]:
        for row in matrix:
            row.reverse()
        for row in range(len(matrix)):
            for col in range(row + 1, len(matrix)):
                matrix[row][col], matrix[col][row] = matrix[col][row], matrix[row][col]
        return matrix
