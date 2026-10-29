# @solution queue-bfs accept
from typing import List, Optional
from collections import deque
class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        if not root: return []
        q = deque([root]); result = []
        while q:
            row = []
            for _ in range(len(q)):
                node = q.popleft(); row.append(node.val)
                if node.left: q.append(node.left)
                if node.right: q.append(node.right)
            result.append(row)
        return result

# @solution depth-first-level-buckets accept
from typing import List, Optional
class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        result = []
        def visit(node, depth):
            if not node: return
            if depth == len(result): result.append([])
            result[depth].append(node.val); visit(node.left, depth+1); visit(node.right, depth+1)
        visit(root, 0); return result
