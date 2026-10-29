# @solution sliding-frequency-array accept
class Solution:
    def findAnagrams(self, s, p):
        if len(p) > len(s):
            return []
        target = [0] * 26
        window = [0] * 26
        for char in p:
            target[ord(char) - 97] += 1
        result = []
        width = len(p)
        for i, char in enumerate(s):
            window[ord(char) - 97] += 1
            if i >= width:
                window[ord(s[i - width]) - 97] -= 1
            if i >= width - 1 and window == target:
                result.append(i - width + 1)
        return result

# @solution counter-difference accept
class Solution:
    def findAnagrams(self, s, p):
        from collections import Counter
        width = len(p)
        if width > len(s):
            return []
        need = Counter(p)
        window = Counter(s[:width])
        result = []
        if window == need:
            result.append(0)
        for right in range(width, len(s)):
            entering = s[right]
            leaving = s[right - width]
            window[entering] += 1
            window[leaving] -= 1
            if window[leaving] == 0:
                del window[leaving]
            if window == need:
                result.append(right - width + 1)
        return result
# @solution misses-overlapping-windows reject
class Solution:
    def findAnagrams(self, s, p):
        result = []
        start = 0
        while start + len(p) <= len(s):
            if sorted(s[start:start + len(p)]) == sorted(p):
                result.append(start)
                start += len(p)
            else:
                start += 1
        return result

