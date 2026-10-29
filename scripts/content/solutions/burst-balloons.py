# @solution interval-dp accept
from typing import List
class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        a = [1] + nums + [1]; n = len(nums); dp = [[0]*(n+2) for _ in range(n+2)]
        for length in range(1, n+1):
            for left in range(1, n-length+2):
                right = left+length-1
                dp[left][right] = max(a[left-1]*a[k]*a[right+1] + dp[left][k-1] + dp[k+1][right] for k in range(left,right+1))
        return dp[1][n]

# @solution memoized-interval accept
from typing import List
from functools import lru_cache
class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        a = (1, *nums, 1)
        @lru_cache(None)
        def solve(left, right):
            if left > right: return 0
            return max(a[left-1]*a[k]*a[right+1] + solve(left,k-1) + solve(k+1,right) for k in range(left,right+1))
        return solve(1, len(nums))

# @solution permutation-search tle
from typing import List
class Solution:
    def maxCoins(self, nums: List[int]) -> int:
        best = [0]
        def search(values, score):
            if not values:
                best[0] = max(best[0], score); return
            for i in range(len(values)):
                value = values.pop(i)
                left = values[i-1] if i else 1
                right = values[i] if i < len(values) else 1
                search(values, score+left*value*right)
                values.insert(i, value)
        search(nums, 0); return best[0]
