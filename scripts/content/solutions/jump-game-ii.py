# @solution greedy-reach-frontier accept
class Solution:
    def jump(self, nums):
        jumps = current_end = farthest = 0
        for i in range(len(nums) - 1):
            farthest = max(farthest, i + nums[i])
            if i == current_end:
                jumps += 1
                current_end = farthest
        return jumps

# @solution range-chmin-dynamic-programming accept
class Solution:
    def jump(self, nums):
        n = len(nums)
        size = 1
        while size < n: size *= 2
        lazy = [n] * (2 * size)
        def range_min_update(left, right, value):
            left += size; right += size
            while left < right:
                if left & 1:
                    lazy[left] = min(lazy[left], value); left += 1
                if right & 1:
                    right -= 1; lazy[right] = min(lazy[right], value)
                left //= 2; right //= 2
        def point_min(index):
            index += size
            answer = n
            while index:
                answer = min(answer, lazy[index])
                index //= 2
            return answer
        lazy[size] = 0
        for i in range(n - 1):
            steps = point_min(i)
            end = min(n, i + nums[i] + 1)
            if i + 1 < end: range_min_update(i + 1, end, steps + 1)
        return point_min(n - 1)

# @solution exponential-path-enumeration tle
import sys
sys.setrecursionlimit(20000)
class Solution:
    def jump(self, nums):
        def search(index):
            if index >= len(nums) - 1: return 0
            best = len(nums)
            for nxt in range(index + 1, min(len(nums), index + nums[index] + 1)):
                best = min(best, 1 + search(nxt))
            return best
        return search(0)
