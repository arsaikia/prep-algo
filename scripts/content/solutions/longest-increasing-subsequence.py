# @solution patience-binary-search accept
from bisect import bisect_left
from typing import List
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        tails = []
        for x in nums:
            i = bisect_left(tails,x)
            if i == len(tails): tails.append(x)
            else: tails[i] = x
        return len(tails)

# @solution coordinate-compressed-fenwick accept
from bisect import bisect_left
from typing import List
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        values=sorted(set(nums)); tree=[0]*(len(values)+1)
        def query(i):
            best=0
            while i:
                best=max(best,tree[i]); i-=i&-i
            return best
        for x in nums:
            i=bisect_left(values,x)+1; length=query(i-1)+1
            while i<len(tree): tree[i]=max(tree[i],length); i+=i&-i
        return query(len(values))

# @solution quadratic-dynamic-programming-tle tle
from typing import List
class Solution:
    def lengthOfLIS(self, nums: List[int]) -> int:
        dp = [1] * len(nums)
        for i in range(len(nums)):
            for j in range(i):
                if nums[j] < nums[i]: dp[i] = max(dp[i],dp[j]+1)
        return max(dp,default=0)
