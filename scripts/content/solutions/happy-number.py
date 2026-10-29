# @solution visited-cycle-detection accept
class Solution:
    def isHappy(self, n):
        seen = set()
        while n != 1 and n not in seen:
            seen.add(n)
            n = sum(int(ch) ** 2 for ch in str(n))
        return n == 1

# @solution floyd-cycle-detection accept
class Solution:
    def isHappy(self, n):
        def next_value(value):
            total = 0
            while value:
                value, digit = divmod(value, 10)
                total += digit * digit
            return total
        slow, fast = n, next_value(next_value(n))
        while fast != 1 and slow != fast:
            slow = next_value(slow)
            fast = next_value(next_value(fast))
        return fast == 1
