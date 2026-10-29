# @solution decimal-digit-arithmetic accept
class Solution:
    def reverse(self, x: int) -> int:
        sign = -1 if x < 0 else 1
        value = abs(x)
        reversed_value = 0
        while value:
            reversed_value = reversed_value * 10 + value % 10
            value //= 10
        reversed_value *= sign
        return reversed_value if -2**31 <= reversed_value <= 2**31 - 1 else 0

# @solution string-digit-reversal accept
class Solution:
    def reverse(self, x: int) -> int:
        sign = -1 if x < 0 else 1
        value = int(str(abs(x))[::-1]) * sign
        return value if -2**31 <= value <= 2**31 - 1 else 0

# @solution ignores-signed-overflow reject
class Solution:
    def reverse(self, x: int) -> int:
        sign = -1 if x < 0 else 1
        return sign * int(str(abs(x))[::-1])
