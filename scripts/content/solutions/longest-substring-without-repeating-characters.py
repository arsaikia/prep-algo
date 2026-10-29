# @solution last-seen-index accept
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last={}; left=best=0
        for right,ch in enumerate(s):
            left=max(left,last.get(ch,-1)+1); last[ch]=right; best=max(best,right-left+1)
        return best

# @solution set-window accept
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        seen=set(); left=best=0
        for right,ch in enumerate(s):
            while ch in seen: seen.remove(s[left]); left += 1
            seen.add(ch); best=max(best,right-left+1)
        return best

