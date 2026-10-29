# @solution opening-bracket-stack accept
class Solution:
    def isValid(self, s):
        expected = []
        closes = {')': '(', ']': '[', '}': '{'}
        for char in s:
            if char in closes:
                if not expected or expected.pop() != closes[char]:
                    return False
            else:
                expected.append(char)
        return not expected

# @solution direct-pair-stack accept
class Solution:
    def isValid(self, s):
        stack = []
        for char in s:
            if char == '(':
                stack.append(')')
            elif char == '[':
                stack.append(']')
            elif char == '{':
                stack.append('}')
            elif not stack or stack.pop() != char:
                return False
        return not stack
