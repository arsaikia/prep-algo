# @solution character-count-difference accept
from collections import Counter

class Solution:
    def isAnagram(self, s, t):
        return Counter(s) == Counter(t)

# @solution sorted-character-sequences accept
class Solution:
    def isAnagram(self, s, t):
        return len(s) == len(t) and sorted(s) == sorted(t)
