# @solution rolling-row-dp accept
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        if len(text2) > len(text1): text1, text2 = text2, text1
        prev = [0] * (len(text2)+1)
        for a in text1:
            cur = [0]
            for j,b in enumerate(text2,1): cur.append(prev[j-1]+1 if a == b else max(prev[j],cur[-1]))
            prev = cur
        return prev[-1]

# @solution memoized-recursion accept
import sys
from functools import lru_cache
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        sys.setrecursionlimit(5000)
        @lru_cache(None)
        def dp(i,j):
            if i == len(text1) or j == len(text2): return 0
            if text1[i] == text2[j]: return 1 + dp(i+1,j+1)
            return max(dp(i+1,j), dp(i,j+1))
        return dp(0,0)

# @solution exponential-no-memo tle
class Solution:
    def longestCommonSubsequence(self, text1: str, text2: str) -> int:
        def dp(i,j):
            if i == len(text1) or j == len(text2): return 0
            if text1[i] == text2[j]: return 1 + dp(i+1,j+1)
            return max(dp(i+1,j), dp(i,j+1))
        return dp(0,0)
