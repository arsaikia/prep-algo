# @solution memoized-dfs accept
import sys
from functools import lru_cache
from typing import List
class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        if not matrix or not matrix[0]: return 0
        m,n = len(matrix),len(matrix[0])
        sys.setrecursionlimit(m*n+100)
        @lru_cache(None)
        def visit(r,c):
            best = 1
            for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):
                nr,nc = r+dr,c+dc
                if 0 <= nr < m and 0 <= nc < n and matrix[nr][nc] > matrix[r][c]: best = max(best,1+visit(nr,nc))
            return best
        return max(visit(r,c) for r in range(m) for c in range(n))

# @solution sorted-cell-dp accept
from typing import List
class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        if not matrix or not matrix[0]: return 0
        m,n = len(matrix),len(matrix[0]); cells = sorted((matrix[r][c],r,c) for r in range(m) for c in range(n)); dp = [[1]*n for _ in range(m)]
        for val,r,c in cells:
            for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):
                nr,nc = r+dr,c+dc
                if 0 <= nr < m and 0 <= nc < n and matrix[nr][nc] > val: dp[nr][nc] = max(dp[nr][nc],dp[r][c]+1)
        return max(map(max,dp))
