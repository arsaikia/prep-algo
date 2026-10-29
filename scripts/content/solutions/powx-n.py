# @solution iterative-exponentiation-by-squaring accept
class Solution:
    def myPow(self, x: float, n: int) -> float:
        if n < 0:
            x, n = 1 / x, -n
        result = 1.0
        while n:
            if n & 1:
                result *= x
            x *= x
            n >>= 1
        return result

# @solution recursive-exponentiation-by-squaring accept
class Solution:
    def myPow(self, x: float, n: int) -> float:
        if n == 0:
            return 1.0
        if n < 0:
            return 1.0 / self.myPow(x, -n)
        half = self.myPow(x, n // 2)
        squared = half * half
        return squared * x if n % 2 else squared
