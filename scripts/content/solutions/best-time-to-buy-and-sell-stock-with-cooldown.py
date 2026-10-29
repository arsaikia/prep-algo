# @solution state-dp accept
from typing import List
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        hold = -10**30; sold = 0; rest = 0
        for price in prices:
            old_hold, old_sold, old_rest = hold, sold, rest
            hold = max(old_hold, old_rest - price)
            sold = old_hold + price
            rest = max(old_rest, old_sold)
        return max(sold, rest)

# @solution dp-array accept
from typing import List
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        n = len(prices)
        if n < 2: return 0
        hold = [0] * n; cash = [0] * n
        hold[0] = -prices[0]
        for i in range(1, n):
            hold[i] = max(hold[i-1], (cash[i-2] if i >= 2 else 0) - prices[i])
            cash[i] = max(cash[i-1], hold[i-1] + prices[i])
        return cash[-1]

# @solution exhaustive-action-stack tle
from typing import List
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        stack = [(0, False, False, 0)]; best = 0
        while stack:
            day, holding, cooldown, profit = stack.pop()
            if day == len(prices):
                if not holding: best = max(best, profit)
                continue
            stack.append((day+1, holding, False, profit))
            if holding:
                stack.append((day+1, False, True, profit+prices[day]))
            elif not cooldown:
                stack.append((day+1, True, False, profit-prices[day]))
        return best
