# @solution indexed-bfs accept
from typing import Optional
from collections import deque
class Solution:
    def isCompleteTree(self, root: Optional[TreeNode]) -> bool:
        if not root: return True
        q = deque([root]); gap = False
        while q:
            node = q.popleft()
            for child in (node.left, node.right):
                if child:
                    if gap: return False
                    q.append(child)
                else: gap = True
        return True

# @solution heap-index-count accept
from typing import Optional
from collections import deque
class Solution:
    def isCompleteTree(self, root: Optional[TreeNode]) -> bool:
        if not root: return True
        q = deque([(root,0)]); count = 0; last = 0
        while q:
            node, index = q.popleft(); count += 1; last = index
            if node.left: q.append((node.left,2*index+1))
            if node.right: q.append((node.right,2*index+2))
        return last == count-1
