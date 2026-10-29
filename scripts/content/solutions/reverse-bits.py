# @solution fixed-width-loop accept
class Solution:
    def reverseBits(self, n: int) -> int:
        result = 0
        for _ in range(32):
            result = (result << 1) | (n & 1)
            n >>= 1
        return result

# @solution byte-lookup-table accept
class Solution:
    def reverseBits(self, n: int) -> int:
        table = [int(f"{value:08b}"[::-1], 2) for value in range(256)]
        return (table[n & 255] << 24) | (table[(n >> 8) & 255] << 16) | (table[(n >> 16) & 255] << 8) | table[(n >> 24) & 255]

# @solution reverses-only-significant-bits reject
class Solution:
    def reverseBits(self, n: int) -> int:
        result = 0
        while n:
            result = (result << 1) | (n & 1)
            n >>= 1
        return result
