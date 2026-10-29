# @solution row-column-box-sets accept
class Solution:
    def isValidSudoku(self, board):
        rows = [set() for _ in range(9)]
        columns = [set() for _ in range(9)]
        boxes = [set() for _ in range(9)]
        for row in range(9):
            for col in range(9):
                value = board[row][col]
                if value == '.':
                    continue
                box = (row // 3) * 3 + col // 3
                if value in rows[row] or value in columns[col] or value in boxes[box]:
                    return False
                rows[row].add(value)
                columns[col].add(value)
                boxes[box].add(value)
        return True

# @solution bitmask-constraints accept
class Solution:
    def isValidSudoku(self, board):
        rows = [0] * 9
        columns = [0] * 9
        boxes = [0] * 9
        for row in range(9):
            for col in range(9):
                value = board[row][col]
                if value == '.':
                    continue
                bit = 1 << (ord(value) - ord('1'))
                box = (row // 3) * 3 + col // 3
                if rows[row] & bit or columns[col] & bit or boxes[box] & bit:
                    return False
                rows[row] |= bit
                columns[col] |= bit
                boxes[box] |= bit
        return True
