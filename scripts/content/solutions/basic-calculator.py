# @solution sign-stack accept
class Solution:
    def calculate(self, s: str) -> int:
        result = 0; number = 0; sign = 1; stack = []; expecting_value = True
        i = 0
        while i < len(s):
            ch = s[i]
            if ch.isdigit():
                number = number*10+int(ch); expecting_value = False
            elif ch in '+-':
                if expecting_value:
                    if ch == '-': sign = -sign
                else:
                    result += sign*number; number = 0; sign = 1 if ch == '+' else -1
                    expecting_value = True
            elif ch == '(':
                stack.append((result, sign)); result = 0; sign = 1; number = 0; expecting_value = True
            elif ch == ')':
                result += sign*number; number = 0
                outer, factor = stack.pop(); result = outer + factor*result; sign = 1; expecting_value = False
            i += 1
        return result + sign*number

# @solution recursive-expression-parser accept
class Solution:
    def calculate(self, s: str) -> int:
        def expression(i):
            total = 0
            while True:
                while i < len(s) and s[i] == ' ': i += 1
                sign = 1
                while i < len(s) and s[i] in '+-':
                    if s[i] == '-': sign = -sign
                    i += 1
                    while i < len(s) and s[i] == ' ': i += 1
                if i < len(s) and s[i] == '(':
                    value, i = expression(i+1)
                else:
                    value = 0
                    while i < len(s) and s[i].isdigit(): value = value*10+int(s[i]); i += 1
                total += sign * value
                while i < len(s) and s[i] == ' ': i += 1
                if i >= len(s) or s[i] == ')': return total, i + (i < len(s))
        return expression(0)[0]
