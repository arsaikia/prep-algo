# @solution fixed-frequency-sliding-window accept
from typing import List

class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        if not s1:
            return True
        if len(s1) > len(s2):
            return False
        need = [0] * 26
        window = [0] * 26
        for ch in s1:
            need[ord(ch) - 97] += 1
        for i, ch in enumerate(s2):
            window[ord(ch) - 97] += 1
            if i >= len(s1):
                window[ord(s2[i - len(s1)]) - 97] -= 1
            if window == need:
                return True
        return False

# @solution counter-sliding-window accept
from collections import Counter

class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        width = len(s1)
        if width == 0:
            return True
        if width > len(s2):
            return False
        target = Counter(s1)
        window = Counter(s2[:width])
        if window == target:
            return True
        for right in range(width, len(s2)):
            old = s2[right - width]
            window[old] -= 1
            if window[old] == 0:
                del window[old]
            window[s2[right]] += 1
            if window == target:
                return True
        return False
