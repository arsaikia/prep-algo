# @solution column-and-diagonal-backtracking accept
from typing import List

class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        board = [['.'] * n for _ in range(n)]
        cols, diag1, diag2 = set(), set(), set()
        answers = []
        def place(row):
            if row == n:
                answers.append([''.join(line) for line in board])
                return
            for col in range(n):
                if col in cols or row - col in diag1 or row + col in diag2:
                    continue
                cols.add(col); diag1.add(row - col); diag2.add(row + col)
                board[row][col] = 'Q'
                place(row + 1)
                board[row][col] = '.'
                cols.remove(col); diag1.remove(row - col); diag2.remove(row + col)
        place(0)
        return answers

# @solution bitmask-backtracking accept
from typing import List

class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        answers = []
        board = []
        def place(row, columns, down, up):
            if row == n:
                answers.append(board[:])
                return
            available = ((1 << n) - 1) & ~(columns | down | up)
            while available:
                bit = available & -available
                available -= bit
                col = bit.bit_length() - 1
                board.append('.' * col + 'Q' + '.' * (n - col - 1))
                place(row + 1, columns | bit, ((down | bit) << 1) & ((1 << n) - 1), (up | bit) >> 1)
                board.pop()
        place(0, 0, 0, 0)
        return answers

# @solution one-queen-per-row reject
from typing import List

class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        return [['Q' + '.' * (n - 1)] + ['.' * n for _ in range(n - 1)]]
