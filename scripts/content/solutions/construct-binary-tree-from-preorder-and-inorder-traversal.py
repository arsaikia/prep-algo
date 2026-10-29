# @solution indexed-recursion accept
class Solution:
    def buildTree(self, preorder, inorder):
        import sys
        sys.setrecursionlimit(max(sys.getrecursionlimit(), 20000))
        positions = {value: i for i, value in enumerate(inorder)}
        preorder_index = 0

        def build(left, right):
            nonlocal preorder_index
            if left > right:
                return None
            value = preorder[preorder_index]
            preorder_index += 1
            node = TreeNode(value)
            middle = positions[value]
            node.left = build(left, middle - 1)
            node.right = build(middle + 1, right)
            return node

        return build(0, len(inorder) - 1)

# @solution iterative-traversal-stack accept
class Solution:
    def buildTree(self, preorder, inorder):
        if not preorder:
            return None
        root = TreeNode(preorder[0])
        stack = [root]
        inorder_index = 0
        for value in preorder[1:]:
            node = stack[-1]
            if node.val != inorder[inorder_index]:
                node.left = TreeNode(value)
                stack.append(node.left)
            else:
                while stack and stack[-1].val == inorder[inorder_index]:
                    node = stack.pop()
                    inorder_index += 1
                node.right = TreeNode(value)
                stack.append(node.right)
        return root
