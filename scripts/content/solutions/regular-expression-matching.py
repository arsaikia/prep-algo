# @solution bottom-up-dynamic-programming accept
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        m, n = len(s), len(p)
        dp = [[False] * (n + 1) for _ in range(m + 1)]
        dp[0][0] = True
        for j in range(2, n + 1):
            if p[j - 1] == '*':
                dp[0][j] = dp[0][j - 2]
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if p[j - 1] == '*':
                    dp[i][j] = dp[i][j - 2] or (p[j - 2] in (s[i - 1], '.') and dp[i - 1][j])
                elif p[j - 1] in (s[i - 1], '.'):
                    dp[i][j] = dp[i - 1][j - 1]
        return dp[m][n]

# @solution rolling-row-dynamic-programming accept
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        previous = [False] * (len(p) + 1)
        previous[0] = True
        for j in range(2, len(p) + 1):
            if p[j - 1] == '*':
                previous[j] = previous[j - 2]
        for char in s:
            current = [False] * (len(p) + 1)
            for j in range(1, len(p) + 1):
                if p[j - 1] == '*':
                    current[j] = current[j - 2] or (p[j - 2] in (char, '.') and previous[j])
                elif p[j - 1] in (char, '.'):
                    current[j] = previous[j - 1]
            previous = current
        return previous[len(p)]

# @solution recursion-without-memoization tle
class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        def match(i, j):
            if j == len(p):
                return i == len(s)
            first = i < len(s) and p[j] in (s[i], '.')
            if j + 1 < len(p) and p[j + 1] == '*':
                return match(i, j + 2) or (first and match(i + 1, j))
            return first and match(i + 1, j + 1)
        return match(0, 0)
