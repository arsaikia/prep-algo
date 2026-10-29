# @solution iterative-bst-search accept
from typing import Optional

class Solution:
    def searchBST(self, root: Optional[TreeNode], val: int) -> Optional[TreeNode]:
        while root and root.val != val:
            root = root.left if val < root.val else root.right
        return root

# @solution breadth-first-bst-search accept
from collections import deque
from typing import Optional

class Solution:
    def searchBST(self, root: Optional[TreeNode], val: int) -> Optional[TreeNode]:
        if root is None:
            return None
        queue = deque([root])
        while queue:
            node = queue.popleft()
            if node.val == val:
                return node
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        return None

# @solution returns-matching-node-value reject
from typing import Optional

class Solution:
    def searchBST(self, root: Optional[TreeNode], val: int):
        while root and root.val != val:
            root = root.left if val < root.val else root.right
        return root.val if root else None
