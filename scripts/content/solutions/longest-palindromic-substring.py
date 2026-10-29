# @solution expand-around-centers accept
class Solution:
    def longestPalindrome(self, s: str) -> str:
        start = end = 0
        for center in range(len(s)):
            for left,right in ((center,center),(center,center+1)):
                while left >= 0 and right < len(s) and s[left] == s[right]: left -= 1; right += 1
                if right-left-1 > end-start+1: start,end = left+1,right-1
        return s[start:end+1] if s else ''

# @solution palindrome-dp accept
class Solution:
    def longestPalindrome(self, s: str) -> str:
        n = len(s)
        if n < 2: return s
        dp = [[False]*n for _ in range(n)]; start=0; best=1
        for i in range(n): dp[i][i] = True
        for length in range(2,n+1):
            for i in range(n-length+1):
                j=i+length-1
                if s[i] == s[j] and (length == 2 or dp[i+1][j-1]):
                    dp[i][j] = True
                    if length > best: start,best=i,length
        return s[start:start+best]

# @solution recursive-checks-every-substring tle
class Solution:
    def longestPalindrome(self, s: str) -> str:
        best=''
        def is_palindrome(part):
            if len(part)<2: return True
            return part[0] == part[-1] and is_palindrome(part[1:-1])
        for left in range(len(s)):
            for right in range(left+1,len(s)+1):
                part=s[left:right]
                if is_palindrome(part) and len(part)>len(best): best=part
        return best
