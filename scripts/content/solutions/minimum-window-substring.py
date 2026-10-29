# @solution sliding-window-counter accept
from collections import Counter

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        if not t:
            return ''
        need = Counter(t)
        missing = len(t)
        left = 0
        best_start, best_len = 0, float('inf')
        for right, char in enumerate(s):
            if need[char] > 0:
                missing -= 1
            need[char] -= 1
            while missing == 0:
                if right - left + 1 < best_len:
                    best_start, best_len = left, right - left + 1
                need[s[left]] += 1
                if need[s[left]] > 0:
                    missing += 1
                left += 1
        return '' if best_len == float('inf') else s[best_start:best_start + best_len]

# @solution formed-counter accept
from collections import Counter

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        if not t:
            return ''
        target = Counter(t)
        window = Counter()
        required = len(target)
        formed = 0
        left = 0
        best = (float('inf'), 0, 0)
        for right, char in enumerate(s):
            window[char] += 1
            if char in target and window[char] == target[char]:
                formed += 1
            while formed == required:
                if right - left + 1 < best[0]:
                    best = (right - left + 1, left, right)
                drop = s[left]
                window[drop] -= 1
                if drop in target and window[drop] < target[drop]:
                    formed -= 1
                left += 1
        length, start, end = best
        return '' if length == float('inf') else s[start:end + 1]

# @solution enumerate-windows-with-counts tle
from collections import Counter

class Solution:
    def minWindow(self, s: str, t: str) -> str:
        if not t:
            return ''
        need = Counter(t)
        best_start, best_len = 0, float('inf')
        for left in range(len(s)):
            have = Counter()
            for right in range(left, len(s)):
                if s[right] in need:
                    have[s[right]] += 1
                if all(have[ch] >= count for ch, count in need.items()):
                    if right - left + 1 < best_len:
                        best_start, best_len = left, right - left + 1
                    break
        return '' if best_len == float('inf') else s[best_start:best_start + best_len]

# @solution checks-only-substring-membership reject
class Solution:
    def minWindow(self, s: str, t: str) -> str:
        return t if t in s else ''
