# @solution boundary-bfs accept
from collections import deque
from typing import List

class Solution:
    def solve(self, board: List[List[str]]) -> None:
        if not board or not board[0]:
            return None
        rows, cols = len(board), len(board[0])
        q = deque()
        for r in range(rows):
            for c in (0, cols - 1):
                if board[r][c] == 'O':
                    board[r][c] = '#'; q.append((r, c))
        for c in range(cols):
            for r in (0, rows - 1):
                if board[r][c] == 'O':
                    board[r][c] = '#'; q.append((r, c))
        while q:
            r, c = q.popleft()
            for nr, nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] == 'O':
                    board[nr][nc] = '#'; q.append((nr, nc))
        for r in range(rows):
            for c in range(cols):
                if board[r][c] == 'O': board[r][c] = 'X'
                elif board[r][c] == '#': board[r][c] = 'O'
        return None

# @solution border-marking-stack accept
from typing import List

class Solution:
    def solve(self, board: List[List[str]]) -> None:
        if not board or not board[0]: return None
        rows, cols = len(board), len(board[0])
        stack = [(r,c) for r in range(rows) for c in (0,cols-1) if board[r][c] == 'O']
        stack += [(r,c) for c in range(cols) for r in (0,rows-1) if board[r][c] == 'O']
        while stack:
            r,c = stack.pop()
            if board[r][c] != 'O': continue
            board[r][c] = '#'
            for nr,nc in ((r+1,c),(r-1,c),(r,c+1),(r,c-1)):
                if 0<=nr<rows and 0<=nc<cols and board[nr][nc] == 'O': stack.append((nr,nc))
        for r in range(rows):
            for c in range(cols):
                board[r][c] = 'O' if board[r][c] == '#' else 'X'
        return None

# @solution flips-all-regions reject
from typing import List

class Solution:
    def solve(self, board: List[List[str]]):
        for r in range(len(board)):
            for c in range(len(board[0])):
                if board[r][c] == 'O': board[r][c] = 'X'
