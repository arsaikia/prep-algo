# @solution recursive-child-swap accept
class Solution:
    def invertTree(self, root):
        if root is None: return None
        root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
        return root

# @solution breadth-first-child-swap accept
from collections import deque
class Solution:
    def invertTree(self, root):
        if root is None: return None
        queue = deque([root])
        while queue:
            node = queue.popleft()
            node.left, node.right = node.right, node.left
            if node.left: queue.append(node.left)
            if node.right: queue.append(node.right)
        return root
