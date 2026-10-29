# @solution recursive accept
from typing import List, Optional
class Solution:
    def inorderTraversal(self, root: Optional[TreeNode]) -> List[int]:
        out = []
        def visit(node):
            if node:
                visit(node.left); out.append(node.val); visit(node.right)
        visit(root); return out

# @solution iterative-stack accept
from typing import List, Optional
class Solution:
    def inorderTraversal(self, root: Optional[TreeNode]) -> List[int]:
        result = []; stack = []; node = root
        while node or stack:
            while node: stack.append(node); node = node.left
            node = stack.pop(); result.append(node.val); node = node.right
        return result
