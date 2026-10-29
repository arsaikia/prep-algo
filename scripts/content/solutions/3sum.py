# @solution sort-two-pointer accept
from typing import List
class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        nums.sort()
        out = []
        for i in range(len(nums) - 2):
            if i and nums[i] == nums[i - 1]:
                continue
            if nums[i] > 0:
                break
            left, right = i + 1, len(nums) - 1
            while left < right:
                total = nums[i] + nums[left] + nums[right]
                if total < 0:
                    left += 1
                elif total > 0:
                    right -= 1
                else:
                    out.append([nums[i], nums[left], nums[right]])
                    left += 1
                    right -= 1
                    while left < right and nums[left] == nums[left - 1]: left += 1
                    while left < right and nums[right] == nums[right + 1]: right -= 1
        return out

# @solution hash-complement accept
from typing import List
class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        found = set()
        for i in range(len(nums)):
            seen = set()
            for j in range(i + 1, len(nums)):
                need = -nums[i] - nums[j]
                if need in seen:
                    found.add(tuple(sorted((nums[i], nums[j], need))))
                seen.add(nums[j])
        return sorted([list(t) for t in found])

# @solution cubic-enumeration tle
from typing import List
class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        found = set()
        for i in range(len(nums)):
            for j in range(i+1, len(nums)):
                for k in range(j+1, len(nums)):
                    if nums[i]+nums[j]+nums[k] == 0:
                        found.add(tuple(sorted((nums[i],nums[j],nums[k]))))
        return [list(t) for t in found]

# @solution misses-duplicate-triplets reject
from typing import List
class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        nums.sort(); out = []
        for i in range(len(nums)-2):
            left, right = i+1, len(nums)-1
            while left < right:
                total = nums[i]+nums[left]+nums[right]
                if total == 0: out.append([nums[i],nums[left],nums[right]]); left += 1; right -= 1
                elif total < 0: left += 1
                else: right -= 1
        return out
