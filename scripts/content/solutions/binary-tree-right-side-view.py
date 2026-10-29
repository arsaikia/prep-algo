# @solution bfs-rightmost accept
from typing import List, Optional
from collections import deque
class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        if not root: return []
        q = deque([root]); view = []
        while q:
            level_size = len(q)
            for i in range(level_size):
                node = q.popleft()
                if node.left: q.append(node.left)
                if node.right: q.append(node.right)
                if i == level_size - 1: rightmost = node.val
            view.append(rightmost)
        return view

# @solution dfs-depth accept
from typing import List, Optional
class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        result = []
        def visit(node, depth):
            if not node: return
            if depth == len(result): result.append(node.val)
            visit(node.right, depth+1); visit(node.left, depth+1)
        visit(root, 0); return result
