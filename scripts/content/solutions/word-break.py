# @solution reachable-prefix-dynamic-programming accept
class Solution:
    def wordBreak(self, s, wordDict):
        words = set(wordDict)
        max_length = max((len(word) for word in words), default=0)
        reachable = [False] * (len(s) + 1)
        reachable[0] = True
        for end in range(1, len(s) + 1):
            for start in range(max(0, end - max_length), end):
                if reachable[start] and s[start:end] in words:
                    reachable[end] = True
                    break
        return reachable[-1]

# @solution memoized-suffix-search accept
from functools import lru_cache

class Solution:
    def wordBreak(self, s, wordDict):
        words = set(wordDict)
        max_length = max((len(word) for word in words), default=0)

        @lru_cache(None)
        def can_break(start):
            if start == len(s):
                return True
            end_limit = min(len(s), start + max_length)
            return any(s[start:end] in words and can_break(end)
                       for end in range(start + 1, end_limit + 1))

        return can_break(0)

# @solution uncached-prefix-recursion tle
class Solution:
    def wordBreak(self, s, wordDict):
        words = set(wordDict)
        max_length = max((len(word) for word in words), default=0)

        def can_break(start):
            if start == len(s):
                return True
            for end in range(start + 1, min(len(s), start + max_length) + 1):
                if s[start:end] in words and can_break(end):
                    return True
            return False

        return can_break(0)
