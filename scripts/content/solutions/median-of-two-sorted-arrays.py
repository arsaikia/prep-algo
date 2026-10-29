# @solution binary-partition accept
from typing import List

class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        a, b = nums1, nums2
        if len(a) > len(b):
            a, b = b, a
        m, n = len(a), len(b)
        half = (m + n + 1) // 2
        lo, hi = 0, m
        while lo <= hi:
            i = (lo + hi) // 2
            j = half - i
            if i < m and j > 0 and b[j - 1] > a[i]:
                lo = i + 1
            elif i > 0 and j < n and a[i - 1] > b[j]:
                hi = i - 1
            else:
                left = max(a[i - 1] if i else float('-inf'), b[j - 1] if j else float('-inf'))
                if (m + n) % 2:
                    return float(left)
                right = min(a[i] if i < m else float('inf'), b[j] if j < n else float('inf'))
                return (left + right) / 2.0

# @solution linear-merge accept
from typing import List

class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        merged = []
        i = j = 0
        while i < len(nums1) and j < len(nums2):
            if nums1[i] <= nums2[j]:
                merged.append(nums1[i]); i += 1
            else:
                merged.append(nums2[j]); j += 1
        merged.extend(nums1[i:]); merged.extend(nums2[j:])
        mid = len(merged) // 2
        return float(merged[mid]) if len(merged) % 2 else (merged[mid - 1] + merged[mid]) / 2.0

# @solution ignores-one-array reject
from typing import List

class Solution:
    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:
        return float(nums1[len(nums1) // 2])
