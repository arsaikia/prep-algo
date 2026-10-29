# @solution explicit-value-bounds accept
class Solution:
    def isValidBST(self, root):
        stack = [(root, None, None)]
        while stack:
            node, lower, upper = stack.pop()
            if node is None:
                continue
            if lower is not None and node.val <= lower:
                return False
            if upper is not None and node.val >= upper:
                return False
            stack.append((node.right, node.val, upper))
            stack.append((node.left, lower, node.val))
        return True

# @solution iterative-inorder-ordering accept
class Solution:
    def isValidBST(self, root):
        stack = []
        node = root
        previous = None
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            if previous is not None and node.val <= previous:
                return False
            previous = node.val
            node = node.right
        return True
