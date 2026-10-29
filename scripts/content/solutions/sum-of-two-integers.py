# @solution xor-carry-until-clear accept
class Solution:
    def getSum(self, a: int, b: int) -> int:
        mask = 0xFFFFFFFF
        while b:
            carry = ((a & b) << 1) & mask
            a = (a ^ b) & mask
            b = carry
        return a if a < 0x80000000 else ~(a ^ mask)

# @solution fixed-width-bit-accumulation accept
class Solution:
    def getSum(self, a: int, b: int) -> int:
        mask = 0xFFFFFFFF
        result = 0
        carry = 0
        for bit in range(32):
            x, y = (a >> bit) & 1, (b >> bit) & 1
            total = x ^ y ^ carry
            result |= total << bit
            carry = (x & y) | (x & carry) | (y & carry)
        return result if result < 0x80000000 else result - (1 << 32)

# @solution no-signed-wraparound reject
class Solution:
    def getSum(self, a: int, b: int) -> int:
        mask = 0xFFFFFFFF
        while b:
            a, b = (a ^ b) & mask, ((a & b) << 1) & mask
        return a
