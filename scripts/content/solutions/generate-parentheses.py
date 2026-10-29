# @solution backtracking-prefixes accept
class Solution:
    def generateParenthesis(self, n):
        out = []
        def build(left, right, path):
            if len(path) == 2 * n:
                out.append(path); return
            if left < n: build(left + 1, right, path + '(')
            if right < left: build(left, right + 1, path + ')')
        build(0, 0, '')
        return out

# @solution iterative-state-expansion accept
class Solution:
    def generateParenthesis(self, n):
        states = [(0, 0, '')]
        for _ in range(2 * n):
            next_states = []
            for left, right, text in states:
                if left < n: next_states.append((left + 1, right, text + '('))
                if right < left: next_states.append((left, right + 1, text + ')'))
            states = next_states
        return [text for left, right, text in states if left == right == n]
