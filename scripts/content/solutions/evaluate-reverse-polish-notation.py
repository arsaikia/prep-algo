# @solution operand-stack accept
class Solution:
    def evalRPN(self, tokens):
        stack = []
        for token in tokens:
            if token not in {'+', '-', '*', '/'}:
                stack.append(int(token))
                continue
            right = stack.pop()
            left = stack.pop()
            if token == '+':
                value = left + right
            elif token == '-':
                value = left - right
            elif token == '*':
                value = left * right
            else:
                value = (abs(left) // abs(right)) * (-1 if (left < 0) != (right < 0) else 1)
            stack.append(value)
        return stack[-1]

# @solution recursive-right-to-left-parser accept
class Solution:
    def evalRPN(self, tokens):
        index = len(tokens) - 1
        def parse():
            nonlocal index
            token = tokens[index]
            index -= 1
            if token not in {'+', '-', '*', '/'}:
                return int(token)
            right = parse()
            left = parse()
            if token == '+':
                return left + right
            if token == '-':
                return left - right
            if token == '*':
                return left * right
            return (abs(left) // abs(right)) * (-1 if (left < 0) != (right < 0) else 1)
        return parse()
# @solution floor-divides-negative-values reject
class Solution:
    def evalRPN(self, tokens):
        stack = []
        for token in tokens:
            if token not in {'+', '-', '*', '/'}:
                stack.append(int(token))
                continue
            right, left = stack.pop(), stack.pop()
            if token == '+':
                stack.append(left + right)
            elif token == '-':
                stack.append(left - right)
            elif token == '*':
                stack.append(left * right)
            else:
                stack.append(left // right)
        return stack[-1]

