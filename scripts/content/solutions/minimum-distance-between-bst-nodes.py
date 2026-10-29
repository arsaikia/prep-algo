# @solution inorder-iterative accept
class Solution:
    def minDiffInBST(self, root):
        stack = []
        node = root
        previous = None
        answer = float('inf')
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            if previous is not None:
                answer = min(answer, node.val - previous)
            previous = node.val
            node = node.right
        return answer

# @solution inorder-values-list accept
class Solution:
    def minDiffInBST(self, root):
        values = []
        stack = []
        node = root
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            values.append(node.val)
            node = node.right
        return min(b - a for a, b in zip(values, values[1:]))

# @solution compares-parent-only reject
class Solution:
    def minDiffInBST(self, root):
        answer = float('inf')
        stack = [root] if root else []
        while stack:
            node = stack.pop()
            if node.left:
                answer = min(answer, node.val - node.left.val); stack.append(node.left)
            if node.right:
                answer = min(answer, node.right.val - node.val); stack.append(node.right)
        return answer
