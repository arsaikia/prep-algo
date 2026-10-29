# @solution bottom-up-dp accept
from typing import List
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        dp = [amount+1]*(amount+1); dp[0] = 0
        for total in range(1, amount+1):
            for coin in coins:
                if coin <= total: dp[total] = min(dp[total],dp[total-coin]+1)
        return -1 if dp[amount] > amount else dp[amount]

# @solution bfs-amounts accept
from typing import List
from collections import deque
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        if amount == 0: return 0
        q = deque([(0,0)]); seen = {0}
        while q:
            total, used = q.popleft()
            for coin in coins:
                nxt = total+coin
                if nxt == amount: return used+1
                if nxt < amount and nxt not in seen: seen.add(nxt); q.append((nxt,used+1))
        return -1

# @solution greedy-largest-coin reject
from typing import List
class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        used = 0
        for coin in sorted(coins, reverse=True):
            count, amount = divmod(amount, coin); used += count
        return used if amount == 0 else -1
