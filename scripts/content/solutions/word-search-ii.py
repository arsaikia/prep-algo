# @solution trie-with-pruned-terminal accept
class Solution:
    def findWords(self, board, words):
        if not board or not board[0] or not words:
            return []
        root = {}
        terminal = ''
        for word in set(words):
            node = root
            for char in word:
                node = node.setdefault(char, {})
            node[terminal] = word
        rows, cols = len(board), len(board[0])
        found = []

        def search(row, col, parent):
            char = board[row][col]
            node = parent.get(char)
            if node is None:
                return
            word = node.pop(terminal, None)
            if word is not None:
                found.append(word)
            board[row][col] = '#'
            for nr, nc in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
                if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] != '#':
                    search(nr, nc, node)
            board[row][col] = char
            if not node:
                parent.pop(char)

        for row in range(rows):
            for col in range(cols):
                search(row, col, root)
        return found

# @solution prefix-set-guided-board-search accept
class Solution:
    def findWords(self, board, words):
        if not board or not board[0]:
            return []
        word_set = set(words)
        prefixes = {word[:i] for word in word_set for i in range(1, len(word) + 1)}
        rows, cols = len(board), len(board[0])
        found = set()

        def search(row, col, path, used):
            path += board[row][col]
            if path not in prefixes:
                return
            if path in word_set:
                found.add(path)
            used.add((row, col))
            for nr, nc in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
                if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in used:
                    search(nr, nc, path, used)
            used.remove((row, col))

        for row in range(rows):
            for col in range(cols):
                search(row, col, '', set())
        return list(found)
