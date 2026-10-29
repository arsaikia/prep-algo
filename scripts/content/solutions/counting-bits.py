# @solution recurrence-by-halving accept
class Solution:
    def countBits(self, n):
        result = [0] * (n + 1)
        for value in range(1, n + 1):
            result[value] = result[value >> 1] + (value & 1)
        return result

# @solution builtin-bit-count accept
class Solution:
    def countBits(self, n):
        return [value.bit_count() for value in range(n + 1)]
