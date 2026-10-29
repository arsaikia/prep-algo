# @solution boyer-moore-two-candidates accept
from typing import List
class Solution:
    def majorityElement(self, nums: List[int]) -> List[int]:
        a=b=None; ca=cb=0
        for x in nums:
            if a == x: ca += 1
            elif b == x: cb += 1
            elif ca == 0: a=x; ca=1
            elif cb == 0: b=x; cb=1
            else: ca-=1; cb-=1
        return [x for x in (a,b) if x is not None and nums.count(x)>len(nums)//3]

# @solution frequency-counter accept
from collections import Counter
from typing import List
class Solution:
    def majorityElement(self, nums: List[int]) -> List[int]:
        counts=Counter(nums); limit=len(nums)//3
        return [x for x,c in counts.items() if c>limit]

# @solution only-one-majority reject
from typing import List
class Solution:
    def majorityElement(self, nums: List[int]) -> List[int]:
        if not nums: return []
        candidate=nums[0]
        return [candidate] if nums.count(candidate)>len(nums)//3 else []
