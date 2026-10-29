# @solution visited-set-depth-first-search accept
class Solution:
    def exist(self, board, word):
        if not word:
            return True
        if not board or not board[0]:
            return False
        rows, cols = len(board), len(board[0])

        def search(row, col, index, seen):
            if board[row][col] != word[index]:
                return False
            if index == len(word) - 1:
                return True
            seen.add((row, col))
            for nr, nc in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
                if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen:
                    if search(nr, nc, index + 1, seen):
                        seen.remove((row, col))
                        return True
            seen.remove((row, col))
            return False

        return any(search(r, c, 0, set()) for r in range(rows) for c in range(cols))

# @solution in-place-marking-with-frequency-prune accept
from collections import Counter

class Solution:
    def exist(self, board, word):
        if not word:
            return True
        if not board or not board[0]:
            return False
        available = Counter(char for row in board for char in row)
        required = Counter(word)
        if any(available[char] < count for char, count in required.items()):
            return False
        if available[word[0]] > available[word[-1]]:
            word = word[::-1]
        rows, cols = len(board), len(board[0])

        def search(row, col, index):
            if board[row][col] != word[index]:
                return False
            if index == len(word) - 1:
                return True
            char = board[row][col]
            board[row][col] = None
            for nr, nc in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] is not None:
                    if search(nr, nc, index + 1):
                        board[row][col] = char
                        return True
            board[row][col] = char
            return False

        return any(search(r, c, 0) for r in range(rows) for c in range(cols))
