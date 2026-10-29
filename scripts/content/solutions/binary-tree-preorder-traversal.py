# @solution recursive accept
from typing import List, Optional
class Solution:
    def preorderTraversal(self, root: Optional[TreeNode]) -> List[int]:
        result = []
        def visit(node):
            if node: result.append(node.val); visit(node.left); visit(node.right)
        visit(root); return result

# @solution iterative-stack accept
from typing import List, Optional
class Solution:
    def preorderTraversal(self, root: Optional[TreeNode]) -> List[int]:
        if not root: return []
        result = []; stack = [root]
        while stack:
            node = stack.pop(); result.append(node.val)
            if node.right: stack.append(node.right)
            if node.left: stack.append(node.left)
        return result
