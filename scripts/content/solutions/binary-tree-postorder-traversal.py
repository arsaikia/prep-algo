# @solution recursive accept
from typing import List, Optional
class Solution:
    def postorderTraversal(self, root: Optional[TreeNode]) -> List[int]:
        result = []
        def visit(node):
            if node: visit(node.left); visit(node.right); result.append(node.val)
        visit(root); return result

# @solution two-stack accept
from typing import List, Optional
class Solution:
    def postorderTraversal(self, root: Optional[TreeNode]) -> List[int]:
        if not root: return []
        first = [root]; second = []
        while first:
            node = first.pop(); second.append(node)
            if node.left: first.append(node.left)
            if node.right: first.append(node.right)
        return [node.val for node in reversed(second)]
