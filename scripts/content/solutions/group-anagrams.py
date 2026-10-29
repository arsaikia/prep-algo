# @solution sorted-character-key accept
from collections import defaultdict
class Solution:
    def groupAnagrams(self, strs):
        groups = defaultdict(list)
        for word in strs: groups[''.join(sorted(word))].append(word)
        return list(groups.values())

# @solution letter-frequency-key accept
from collections import defaultdict
class Solution:
    def groupAnagrams(self, strs):
        groups = defaultdict(list)
        for word in strs:
            counts = [0] * 26
            for ch in word: counts[ord(ch) - 97] += 1
            groups[tuple(counts)].append(word)
        return list(groups.values())
