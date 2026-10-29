# @solution greedy-farthest-index accept
class Solution:
    def canJump(self, nums):
        reach = 0
        for i, step in enumerate(nums):
            if i > reach: return False
            reach = max(reach, i + step)
            if reach >= len(nums) - 1: return True
        return True

# @solution reverse-goal-reachability accept
class Solution:
    def canJump(self, nums):
        goal = len(nums) - 1
        for i in range(len(nums) - 2, -1, -1):
            if i + nums[i] >= goal: goal = i
        return goal == 0

# @solution exponential-path-enumeration tle
import sys
sys.setrecursionlimit(20000)
class Solution:
    def canJump(self, nums):
        def reaches_end(index):
            if index >= len(nums) - 1: return True
            for nxt in range(index + 1, min(len(nums), index + nums[index] + 1)):
                if reaches_end(nxt): return True
            return False
        return reaches_end(0)
