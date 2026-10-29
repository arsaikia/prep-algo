# @solution two-pointer accept
class Solution:
    def maxArea(self, height):
        left, right = 0, len(height) - 1
        best = 0
        while left < right:
            best = max(best, min(height[left], height[right]) * (right - left))
            if height[left] < height[right]:
                left += 1
            else:
                right -= 1
        return best

# @solution skip-dominated-heights accept
class Solution:
    def maxArea(self, height):
        left, right = 0, len(height) - 1
        best = 0
        while left < right:
            left_height, right_height = height[left], height[right]
            best = max(best, min(left_height, right_height) * (right - left))
            if left_height <= right_height:
                while left < right and height[left] <= left_height:
                    left += 1
            else:
                while left < right and height[right] <= right_height:
                    right -= 1
        return best

# @solution all-pairs tle
class Solution:
    def maxArea(self, height):
        best = 0
        for left in range(len(height)):
            for right in range(left + 1, len(height)):
                best = max(best, min(height[left], height[right]) * (right - left))
        return best
# @solution use-tallest-line-only reject
class Solution:
    def maxArea(self, height):
        return max(height)

