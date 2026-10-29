# @solution iterative-inorder accept
from typing import Optional
class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        stack = []
        while root or stack:
            while root:
                stack.append(root); root = root.left
            root = stack.pop()
            k -= 1
            if k == 0: return root.val
            root = root.right

# @solution recursive-inorder-count accept
import sys
from typing import Optional
class Solution:
    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:
        sys.setrecursionlimit(20000)
        count = 0
        answer = 0
        def visit(node):
            nonlocal count, answer
            if not node or count >= k: return
            visit(node.left)
            count += 1
            if count == k: answer = node.val; return
            visit(node.right)
        visit(root)
        return answer
