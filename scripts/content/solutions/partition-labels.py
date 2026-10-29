# @solution last-occurrence-greedy accept
from typing import List

class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        last = {char: i for i, char in enumerate(s)}
        result = []
        start = end = 0
        for i, char in enumerate(s):
            end = max(end, last[char])
            if i == end:
                result.append(end - start + 1)
                start = i + 1
        return result

# @solution extend-until-all-characters-closed accept
from typing import List

class Solution:
    def partitionLabels(self, s: str) -> List[int]:
        result = []
        start = 0
        while start < len(s):
            end = start
            scan = start
            while scan <= end:
                end = max(end, s.rfind(s[scan]))
                scan += 1
            result.append(end - start + 1)
            start = end + 1
        return result
