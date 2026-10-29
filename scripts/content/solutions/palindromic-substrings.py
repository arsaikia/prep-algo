# @solution expand-around-centers accept
class Solution:
    def countSubstrings(self, s: str) -> int:
        count = 0
        for center in range(2 * len(s) - 1):
            left, right = center // 2, (center + 1) // 2
            while left >= 0 and right < len(s) and s[left] == s[right]:
                count += 1
                left -= 1
                right += 1
        return count

# @solution odd-and-even-manacher-radii accept
class Solution:
    def countSubstrings(self, s: str) -> int:
        n = len(s)
        odd = [0] * n
        left, right = 0, -1
        count = 0
        for center in range(n):
            radius = 1 if center > right else min(odd[left + right - center], right - center + 1)
            while center - radius >= 0 and center + radius < n and s[center - radius] == s[center + radius]:
                radius += 1
            odd[center] = radius
            count += radius
            if center + radius - 1 > right:
                left, right = center - radius + 1, center + radius - 1
        even = [0] * n
        left, right = 0, -1
        for center in range(n):
            radius = 0 if center > right else min(even[left + right - center + 1], right - center + 1)
            while center - radius - 1 >= 0 and center + radius < n and s[center - radius - 1] == s[center + radius]:
                radius += 1
            even[center] = radius
            count += radius
            if center + radius - 1 > right:
                left, right = center - radius, center + radius - 1
        return count

# @solution checks-every-slice tle
class Solution:
    def countSubstrings(self, s: str) -> int:
        count = 0
        for start in range(len(s)):
            for end in range(start, len(s)):
                length = end - start + 1
                if all(s[start + offset] == s[end - offset] for offset in range(length)):
                    count += 1
        return count
