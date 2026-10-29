# @solution postorder-gain accept
from typing import Optional
class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        best = -10**30
        def gain(node):
            nonlocal best
            if not node: return 0
            left = max(0, gain(node.left)); right = max(0, gain(node.right))
            best = max(best, node.val + left + right)
            return node.val + max(left, right)
        gain(root); return best

# @solution iterative-postorder accept
from typing import Optional
class Solution:
    def maxPathSum(self, root: Optional[TreeNode]) -> int:
        if not root: return 0
        best = -10**30; gains = {}; stack = [(root, False)]
        while stack:
            node, done = stack.pop()
            if not done:
                stack.append((node, True))
                if node.right: stack.append((node.right, False))
                if node.left: stack.append((node.left, False))
            else:
                left = max(0, gains.get(node.left, 0)); right = max(0, gains.get(node.right, 0))
                best = max(best, node.val + left + right); gains[node] = node.val + max(left, right)
        return best
