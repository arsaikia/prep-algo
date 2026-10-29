# @solution builtin-bit-count accept
class Solution:
    def hammingWeight(self, n: int) -> int:
        return n.bit_count()

# @solution fixed-width-shift-count accept
class Solution:
    def hammingWeight(self, n: int) -> int:
        count = 0
        for _ in range(32):
            count += n & 1
            n >>= 1
        return count
