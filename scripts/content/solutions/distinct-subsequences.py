# @solution one-dimensional-dp accept
class Solution:
    def numDistinct(self, s, t):
        ways = [0] * (len(t) + 1)
        ways[0] = 1
        for char in s:
            for j in range(len(t) - 1, -1, -1):
                if char == t[j]:
                    ways[j + 1] += ways[j]
        return ways[-1]

# @solution two-dimensional-dp accept
class Solution:
    def numDistinct(self, s, t):
        dp = [[0] * (len(t) + 1) for _ in range(len(s) + 1)]
        for i in range(len(s) + 1):
            dp[i][0] = 1
        for i in range(1, len(s) + 1):
            for j in range(1, len(t) + 1):
                dp[i][j] = dp[i - 1][j]
                if s[i - 1] == t[j - 1]:
                    dp[i][j] += dp[i - 1][j - 1]
        return dp[-1][-1]

# @solution uncached-recursion tle
class Solution:
    def numDistinct(self, s, t):
        def count(i, j):
            if j == len(t):
                return 1
            if i == len(s) or len(s) - i < len(t) - j:
                return 0
            result = count(i + 1, j)
            if s[i] == t[j]:
                result += count(i + 1, j + 1)
            return result
        return count(0, 0)
# @solution updates-target-forward reject
class Solution:
    def numDistinct(self, s, t):
        ways = [0] * (len(t) + 1)
        ways[0] = 1
        for char in s:
            for j in range(len(t)):
                if char == t[j]:
                    ways[j + 1] += ways[j]
        return ways[-1]

