# @solution recursive-height accept
class Solution:
    def diameterOfBinaryTree(self, root):
        import sys
        sys.setrecursionlimit(max(sys.getrecursionlimit(), 20000))
        best = 0
        def height(node):
            nonlocal best
            if node is None:
                return 0
            left = height(node.left)
            right = height(node.right)
            best = max(best, left + right)
            return max(left, right) + 1
        height(root)
        return best

# @solution iterative-postorder accept
class Solution:
    def diameterOfBinaryTree(self, root):
        if root is None:
            return 0
        heights = {}
        best = 0
        stack = [(root, False)]
        while stack:
            node, visited = stack.pop()
            if not visited:
                stack.append((node, True))
                if node.right:
                    stack.append((node.right, False))
                if node.left:
                    stack.append((node.left, False))
            else:
                left = heights.get(node.left, 0)
                right = heights.get(node.right, 0)
                best = max(best, left + right)
                heights[node] = max(left, right) + 1
        return best
# @solution counts-nodes-not-edges reject
class Solution:
    def diameterOfBinaryTree(self, root):
        best = 0
        def height(node):
            nonlocal best
            if node is None:
                return 0
            left, right = height(node.left), height(node.right)
            best = max(best, left + right + 1)
            return max(left, right) + 1
        height(root)
        return best

