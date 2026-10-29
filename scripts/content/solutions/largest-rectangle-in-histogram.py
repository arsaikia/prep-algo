# @solution monotonic-stack accept
from typing import List
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        stack = []
        best = 0
        for i, h in enumerate(heights + [0]):
            while stack and heights[stack[-1]] > h:
                height = heights[stack.pop()]
                left = stack[-1] + 1 if stack else 0
                best = max(best, height * (i - left))
            stack.append(i)
        return best

# @solution nearest-smaller-boundaries accept
from typing import List
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        n = len(heights); left = [0] * n; right = [n] * n; stack = []
        for i,h in enumerate(heights):
            while stack and heights[stack[-1]] >= h: stack.pop()
            left[i] = stack[-1] if stack else -1
            stack.append(i)
        stack.clear()
        for i in range(n-1,-1,-1):
            while stack and heights[stack[-1]] >= heights[i]: stack.pop()
            right[i] = stack[-1] if stack else n
            stack.append(i)
        return max((heights[i] * (right[i]-left[i]-1) for i in range(n)), default=0)

# @solution checks-every-interval tle
from typing import List
class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        best = 0
        for i in range(len(heights)):
            low = heights[i]
            for j in range(i, len(heights)):
                low = min(low, heights[j]); best = max(best, low * (j-i+1))
        return best
