# @solution iterative-structural-match accept
from typing import Optional

class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        candidates = [root]
        while candidates:
            node = candidates.pop()
            if node is None:
                continue
            stack = [(node, subRoot)]
            same = True
            while stack:
                a, b = stack.pop()
                if a is None or b is None:
                    if a is not b:
                        same = False
                        break
                    continue
                if a.val != b.val:
                    same = False
                    break
                stack.append((a.left, b.left))
                stack.append((a.right, b.right))
            if same:
                return True
            candidates.extend((node.left, node.right))
        return False

# @solution null-marked-preorder-serialization accept
from typing import Optional

class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        def encode(node):
            if node is None:
                return ('#',)
            return ('N', node.val) + encode(node.left) + encode(node.right)
        needle = encode(subRoot)
        source = encode(root)
        return any(source[i:i + len(needle)] == needle for i in range(len(source) - len(needle) + 1))

# @solution matches-root-value-only reject
from typing import Optional

class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        if root is None: return False
        if root.val == subRoot.val: return True
        return self.isSubtree(root.left, subRoot) or self.isSubtree(root.right, subRoot)
