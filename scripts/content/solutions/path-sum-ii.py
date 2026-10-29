# @solution recursive-depth-first-search accept
from typing import List, Optional

class Solution:
    def pathSum(self, root: Optional[TreeNode], targetSum: int) -> List[List[int]]:
        result, path = [], []
        def visit(node, remaining):
            if node is None:
                return
            path.append(node.val)
            remaining -= node.val
            if node.left is None and node.right is None and remaining == 0:
                result.append(path.copy())
            else:
                visit(node.left, remaining)
                visit(node.right, remaining)
            path.pop()
        visit(root, targetSum)
        return result

# @solution iterative-stack-traversal accept
from typing import List, Optional

class Solution:
    def pathSum(self, root: Optional[TreeNode], targetSum: int) -> List[List[int]]:
        if root is None:
            return []
        result = []
        stack = [(root, targetSum - root.val, [root.val])]
        while stack:
            node, remaining, path = stack.pop()
            if node.left is None and node.right is None:
                if remaining == 0:
                    result.append(path)
                continue
            if node.right is not None:
                stack.append((node.right, remaining - node.right.val, path + [node.right.val]))
            if node.left is not None:
                stack.append((node.left, remaining - node.left.val, path + [node.left.val]))
        return result
