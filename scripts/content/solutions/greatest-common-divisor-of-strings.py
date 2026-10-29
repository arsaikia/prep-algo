# @solution concatenation-and-gcd accept
from math import gcd
class Solution:
    def gcdOfStrings(self, str1, str2):
        if str1 + str2 != str2 + str1: return ''
        return str1[:gcd(len(str1), len(str2))]

# @solution repeated-prefix-check accept
class Solution:
    def gcdOfStrings(self, str1, str2):
        if not str1 or not str2: return ''
        limit = min(len(str1), len(str2))
        for length in range(limit, 0, -1):
            if len(str1) % length or len(str2) % length: continue
            prefix = str1[:length]
            if prefix * (len(str1) // length) == str1 and prefix * (len(str2) // length) == str2:
                return prefix
        return ''
