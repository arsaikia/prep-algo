# @solution rolling-row-dp accept
class Solution:
    def minDistance(self, word1, word2):
        if len(word1) < len(word2):
            word1, word2 = word2, word1
        previous = list(range(len(word2) + 1))
        for i, left in enumerate(word1, 1):
            current = [i] + [0] * len(word2)
            for j, right in enumerate(word2, 1):
                current[j] = min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left != right))
            previous = current
        return previous[-1]

# @solution full-matrix-dp accept
class Solution:
    def minDistance(self, word1, word2):
        rows, cols = len(word1), len(word2)
        dp = [[0] * (cols + 1) for _ in range(rows + 1)]
        for i in range(rows + 1):
            dp[i][0] = i
        for j in range(cols + 1):
            dp[0][j] = j
        for i in range(1, rows + 1):
            for j in range(1, cols + 1):
                cost = word1[i - 1] != word2[j - 1]
                dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
        return dp[rows][cols]

# @solution uncached-recursion tle
class Solution:
    def minDistance(self, word1, word2):
        def distance(i, j):
            if i == len(word1):
                return len(word2) - j
            if j == len(word2):
                return len(word1) - i
            if word1[i] == word2[j]:
                return distance(i + 1, j + 1)
            return 1 + min(distance(i + 1, j), distance(i, j + 1), distance(i + 1, j + 1))
        return distance(0, 0)
# @solution omits-final-operation reject
class Solution:
    def minDistance(self, word1, word2):
        previous = list(range(len(word2) + 1))
        for i, left in enumerate(word1, 1):
            current = [i] + [0] * len(word2)
            for j, right in enumerate(word2, 1):
                current[j] = min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left != right))
            previous = current
        return max(0, previous[-1] - 1)

