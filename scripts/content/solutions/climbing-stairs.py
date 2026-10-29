# @solution iterative-fibonacci accept
class Solution:
    def climbStairs(self, n: int) -> int:
        a,b = 1,1
        for _ in range(n): a,b = b,a+b
        return a

# @solution fast-doubling accept
class Solution:
    def climbStairs(self, n: int) -> int:
        def fib(k):
            if k == 0: return (0,1)
            a,b = fib(k//2); c = a*(2*b-a); d = a*a+b*b
            return (d,c+d) if k%2 else (c,d)
        return fib(n+1)[0]

# @solution naive-recursion tle
class Solution:
    def climbStairs(self, n: int) -> int:
        if n <= 1: return 1
        if n == 2: return 2
        return self.climbStairs(n-1) + self.climbStairs(n-2)
