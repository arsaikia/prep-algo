# @solution iterative-depth-first accept
class Solution:
    def maxDepth(self, root):
        if root is None:
            return 0
        stack = [(root, 1)]
        answer = 0
        while stack:
            node, depth = stack.pop()
            answer = max(answer, depth)
            if node.left:
                stack.append((node.left, depth + 1))
            if node.right:
                stack.append((node.right, depth + 1))
        return answer

# @solution breadth-first-depth accept
from collections import deque

class Solution:
    def maxDepth(self, root):
        if root is None:
            return 0
        queue = deque([root])
        depth = 0
        while queue:
            for _ in range(len(queue)):
                node = queue.popleft()
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)
            depth += 1
        return depth

# @solution root-only-depth reject
class Solution:
    def maxDepth(self, root):
        return 1 if root else 0
