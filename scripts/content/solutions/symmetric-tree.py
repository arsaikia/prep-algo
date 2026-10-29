# @solution stack-mirror-pairs accept
from typing import Optional

class Solution:
    def isSymmetric(self, root: Optional[TreeNode]) -> bool:
        if root is None:
            return True
        stack = [(root.left, root.right)]
        while stack:
            left, right = stack.pop()
            if left is None or right is None:
                if left is not right:
                    return False
                continue
            if left.val != right.val:
                return False
            stack.append((left.left, right.right))
            stack.append((left.right, right.left))
        return True

# @solution queue-mirror-pairs accept
from collections import deque
from typing import Optional

class Solution:
    def isSymmetric(self, root: Optional[TreeNode]) -> bool:
        if root is None: return True
        q = deque([(root.left, root.right)])
        while q:
            a,b = q.popleft()
            if a is None or b is None:
                if a is not b: return False
                continue
            if a.val != b.val: return False
            q.append((a.left,b.right))
            q.append((a.right,b.left))
        return True

# @solution compares-same-side-children reject
from typing import Optional

class Solution:
    def isSymmetric(self, root: Optional[TreeNode]) -> bool:
        if root is None: return True
        def same(a,b):
            if a is None or b is None: return a is b
            return a.val == b.val and same(a.left,b.left) and same(a.right,b.right)
        return same(root.left, root.right)
