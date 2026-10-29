# @solution sliding-window-max-count accept
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        counts = {}; left = best = max_count = 0
        for right,ch in enumerate(s):
            counts[ch] = counts.get(ch,0)+1; max_count = max(max_count,counts[ch])
            while right-left+1-max_count > k:
                counts[s[left]] -= 1; left += 1
            best = max(best,right-left+1)
        return best

# @solution binary-search-window-length accept
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        def possible(length):
            counts = {}
            for i,ch in enumerate(s):
                counts[ch] = counts.get(ch,0)+1
                if i >= length: counts[s[i-length]] -= 1
                if i+1 >= length and length-max(counts.values()) <= k: return True
            return length == 0
        lo,hi=0,len(s)
        while lo < hi:
            mid=(lo+hi+1)//2
            if possible(mid): lo=mid
            else: hi=mid-1
        return lo

# @solution recomputes-every-substring tle
class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        best=0
        for left in range(len(s)):
            counts={}
            for right in range(left,len(s)):
                ch=s[right]; counts[ch]=counts.get(ch,0)+1
                if right-left+1-max(counts.values())<=k: best=max(best,right-left+1)
        return best
