# @solution palindrome-table-backtracking accept
from typing import List

class Solution:
    def partition(self, s: str) -> List[List[str]]:
        n = len(s)
        pal = [[False] * n for _ in range(n)]
        for end in range(n):
            for start in range(end + 1):
                pal[start][end] = s[start] == s[end] and (end - start < 2 or pal[start + 1][end - 1])
        result, path = [], []
        def visit(start):
            if start == n:
                result.append(path.copy())
                return
            for end in range(start, n):
                if pal[start][end]:
                    path.append(s[start:end + 1])
                    visit(end + 1)
                    path.pop()
        visit(0)
        return result

# @solution recursive-palindrome-check accept
from typing import List

class Solution:
    def partition(self, s: str) -> List[List[str]]:
        result, path = [], []
        def visit(start):
            if start == len(s):
                result.append(path.copy())
                return
            for end in range(start + 1, len(s) + 1):
                part = s[start:end]
                if part == part[::-1]:
                    path.append(part)
                    visit(end)
                    path.pop()
        visit(0)
        return result
