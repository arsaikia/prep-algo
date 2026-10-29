# @solution inward-two-pointers accept
class Solution:
    def trap(self, height):
        left, right = 0, len(height) - 1
        left_max = right_max = water = 0
        while left < right:
            if height[left] <= height[right]:
                left_max = max(left_max, height[left])
                water += left_max - height[left]
                left += 1
            else:
                right_max = max(right_max, height[right])
                water += right_max - height[right]
                right -= 1
        return water

# @solution prefix-and-suffix-maxima accept
class Solution:
    def trap(self, height):
        n = len(height)
        if n < 3:
            return 0
        left_max = [0] * n
        right_max = [0] * n
        for i in range(1, n):
            left_max[i] = max(left_max[i - 1], height[i - 1])
        for i in range(n - 2, -1, -1):
            right_max[i] = max(right_max[i + 1], height[i + 1])
        return sum(max(0, min(left_max[i], right_max[i]) - height[i]) for i in range(n))

# @solution recompute-both-sides-for-each-bar tle
class Solution:
    def trap(self, height):
        water = 0
        for i, value in enumerate(height):
            left_max = right_max = value
            for j in range(i):
                if height[j] > left_max:
                    left_max = height[j]
            for j in range(i + 1, len(height)):
                if height[j] > right_max:
                    right_max = height[j]
            water += max(0, min(left_max, right_max) - value)
        return water
