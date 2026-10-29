# @solution recursive-root-to-leaf accept
import sys
from typing import Optional

class Solution:
    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:
        sys.setrecursionlimit(10000)
        if root is None:
            return False
        if root.left is None and root.right is None:
            return root.val == targetSum
        remainder = targetSum - root.val
        return self.hasPathSum(root.left, remainder) or self.hasPathSum(root.right, remainder)

# @solution iterative-depth-first-search accept
from typing import Optional

class Solution:
    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:
        if root is None:
            return False
        stack = [(root, targetSum - root.val)]
        while stack:
            node, remaining = stack.pop()
            if node.left is None and node.right is None and remaining == 0:
                return True
            if node.left is not None:
                stack.append((node.left, remaining - node.left.val))
            if node.right is not None:
                stack.append((node.right, remaining - node.right.val))
        return False

# @solution accepts-non-leaf-path reject
from typing import Optional

class Solution:
    def hasPathSum(self, root: Optional[TreeNode], targetSum: int) -> bool:
        if root is None:
            return False
        if root.val == targetSum:
            return True
        return self.hasPathSum(root.left, targetSum - root.val) or self.hasPathSum(root.right, targetSum - root.val)
