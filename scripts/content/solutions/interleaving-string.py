# @solution two-dimensional-dynamic-programming accept
class Solution:
    def isInterleave(self, s1, s2, s3):
        if len(s1) + len(s2) != len(s3): return False
        rows, cols = len(s1), len(s2)
        dp = [[False] * (cols + 1) for _ in range(rows + 1)]
        dp[0][0] = True
        for i in range(rows + 1):
            for j in range(cols + 1):
                k = i + j - 1
                if i and s1[i - 1] == s3[k] and dp[i - 1][j]: dp[i][j] = True
                if j and s2[j - 1] == s3[k] and dp[i][j - 1]: dp[i][j] = True
        return dp[rows][cols]

# @solution one-dimensional-dynamic-programming accept
class Solution:
    def isInterleave(self, s1, s2, s3):
        if len(s1) + len(s2) != len(s3): return False
        if len(s2) > len(s1): s1, s2 = s2, s1
        dp = [False] * (len(s2) + 1)
        dp[0] = True
        for j in range(1, len(s2) + 1): dp[j] = dp[j - 1] and s2[j - 1] == s3[j - 1]
        for i in range(1, len(s1) + 1):
            dp[0] = dp[0] and s1[i - 1] == s3[i - 1]
            for j in range(1, len(s2) + 1):
                ch = s3[i + j - 1]
                dp[j] = (dp[j] and s1[i - 1] == ch) or (dp[j - 1] and s2[j - 1] == ch)
        return dp[-1]

# @solution exponential-interleave-search tle
class Solution:
    def isInterleave(self, s1, s2, s3):
        if len(s1) + len(s2) != len(s3): return False
        def search(i, j):
            k = i + j
            if k == len(s3): return True
            return ((i < len(s1) and s1[i] == s3[k] and search(i + 1, j)) or
                    (j < len(s2) and s2[j] == s3[k] and search(i, j + 1)))
        return search(0, 0)
