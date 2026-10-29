# @solution bottom-up-array accept
from typing import List

class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        dp = [0] * (len(cost) + 1)
        for i in range(2, len(cost) + 1):
            dp[i] = min(dp[i - 1] + cost[i - 1], dp[i - 2] + cost[i - 2])
        return dp[-1]

# @solution rolling-dp accept
from typing import List

class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        two_back = one_back = 0
        for i in range(2, len(cost) + 1):
            current = min(one_back + cost[i - 1], two_back + cost[i - 2])
            two_back, one_back = one_back, current
        return one_back

# @solution returns-first-cost reject
from typing import List

class Solution:
    def minCostClimbingStairs(self, cost: List[int]) -> int:
        return min(cost[0], cost[1])
