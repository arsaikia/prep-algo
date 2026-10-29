# @solution running-min accept
from typing import List
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        low = float('inf'); best = 0
        for p in prices:
            low = min(low, p); best = max(best, p - low)
        return best

# @solution prefix-suffix accept
from typing import List
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        if not prices: return 0
        suffix = [0] * len(prices); high = prices[-1]
        for i in range(len(prices)-1, -1, -1):
            high = max(high, prices[i]); suffix[i] = high
        return max((suffix[i] - prices[i] for i in range(len(prices))), default=0)

# @solution all-buy-sell-pairs tle
from typing import List
class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        best = 0
        for buy in range(len(prices)):
            for sell in range(buy+1, len(prices)):
                best = max(best, prices[sell]-prices[buy])
        return best
