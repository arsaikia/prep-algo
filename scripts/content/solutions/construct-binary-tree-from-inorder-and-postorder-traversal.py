# @solution indexed-recursion accept
class Solution:
    def buildTree(self, inorder, postorder):
        import sys
        sys.setrecursionlimit(max(sys.getrecursionlimit(), 20000))
        positions = {value: i for i, value in enumerate(inorder)}
        post_index = len(postorder) - 1

        def build(left, right):
            nonlocal post_index
            if left > right:
                return None
            value = postorder[post_index]
            post_index -= 1
            node = TreeNode(value)
            middle = positions[value]
            node.right = build(middle + 1, right)
            node.left = build(left, middle - 1)
            return node

        return build(0, len(inorder) - 1)

# @solution iterative-traversal-stack accept
class Solution:
    def buildTree(self, inorder, postorder):
        if not inorder:
            return None
        root = TreeNode(postorder[-1])
        stack = [root]
        inorder_index = len(inorder) - 1
        for value in reversed(postorder[:-1]):
            node = stack[-1]
            if node.val != inorder[inorder_index]:
                node.right = TreeNode(value)
                stack.append(node.right)
            else:
                while stack and stack[-1].val == inorder[inorder_index]:
                    node = stack.pop()
                    inorder_index -= 1
                node.left = TreeNode(value)
                stack.append(node.left)
        return root
