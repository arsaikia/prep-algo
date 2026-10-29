# @solution combination-dp accept
from typing import List
class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        dp = [0]*(amount+1); dp[0] = 1
        for coin in coins:
            for total in range(coin, amount+1): dp[total] += dp[total-coin]
        return dp[amount]

# @solution two-dimensional-count-dp accept
from typing import List
class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        dp = [[0]*(amount+1) for _ in range(len(coins)+1)]
        dp[0][0] = 1
        for i, coin in enumerate(coins, 1):
            dp[i][0] = 1
            for total in range(1, amount+1):
                dp[i][total] = dp[i-1][total] + (dp[i][total-coin] if total >= coin else 0)
        return dp[-1][amount]

# @solution enumerate-coin-counts tle
from typing import List
class Solution:
    def change(self, amount: int, coins: List[int]) -> int:
        def count(i, remaining):
            if i == len(coins): return int(remaining == 0)
            ways = 0
            for used in range(remaining//coins[i] + 1):
                ways += count(i+1, remaining-used*coins[i])
            return ways
        return count(0, amount)
