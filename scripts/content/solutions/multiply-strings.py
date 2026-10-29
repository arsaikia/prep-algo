# @solution grade-school-array accept
class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        if num1 == '0' or num2 == '0':
            return '0'
        result = [0] * (len(num1) + len(num2))
        for i in range(len(num1) - 1, -1, -1):
            for j in range(len(num2) - 1, -1, -1):
                product = int(num1[i]) * int(num2[j]) + result[i + j + 1]
                result[i + j + 1] = product % 10
                result[i + j] += product // 10
        return ''.join(map(str, result)).lstrip('0') or '0'

# @solution digit-by-digit-accumulation accept
class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        if not num1 or not num2 or num1 == '0' or num2 == '0':
            return '0'
        out = [0] * (len(num1) + len(num2))
        for i, a in enumerate(reversed(num1)):
            for j, b in enumerate(reversed(num2)):
                out[i + j] += int(a) * int(b)
        for i in range(len(out) - 1):
            out[i + 1] += out[i] // 10
            out[i] %= 10
        return ''.join(str(d) for d in reversed(out)).lstrip('0') or '0'

# @solution integer-conversion reject
class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        return str(int(num1) + int(num2))
