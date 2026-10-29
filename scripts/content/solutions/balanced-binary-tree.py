# @solution height-sentinel accept
from typing import Optional
class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def height(node):
            if not node: return 0
            left = height(node.left)
            if left < 0: return -1
            right = height(node.right)
            if right < 0 or abs(left - right) > 1: return -1
            return max(left, right) + 1
        return height(root) >= 0

# @solution bottom-up-pair accept
from typing import Optional
class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        def visit(node):
            if node is None: return True, 0
            lb, lh = visit(node.left); rb, rh = visit(node.right)
            return lb and rb and abs(lh-rh) <= 1, max(lh,rh)+1
        return visit(root)[0]
