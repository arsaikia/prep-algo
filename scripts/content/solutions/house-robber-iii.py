# @solution tree-take-skip-dp accept
import sys
sys.setrecursionlimit(20000)
class Solution:
    def rob(self, root):
        def visit(node):
            if node is None: return 0, 0
            left_take, left_skip = visit(node.left)
            right_take, right_skip = visit(node.right)
            take = node.val + left_skip + right_skip
            skip = max(left_take, left_skip) + max(right_take, right_skip)
            return take, skip
        return max(visit(root))

# @solution iterative-postorder-dp accept
class Solution:
    def rob(self, root):
        if root is None: return 0
        values = {}
        stack = [(root, False)]
        while stack:
            node, ready = stack.pop()
            if node is None: continue
            if ready:
                left = values.get(node.left, (0, 0))
                right = values.get(node.right, (0, 0))
                values[node] = (node.val + left[1] + right[1], max(left) + max(right))
            else:
                stack.append((node, True))
                stack.append((node.right, False)); stack.append((node.left, False))
        return max(values[root])
