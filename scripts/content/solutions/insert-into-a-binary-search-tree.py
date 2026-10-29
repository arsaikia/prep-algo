# @solution recursive-bst-insert accept
import sys
sys.setrecursionlimit(20000)
class Solution:
    def insertIntoBST(self, root, val):
        if root is None: return TreeNode(val)
        if val < root.val: root.left = self.insertIntoBST(root.left, val)
        else: root.right = self.insertIntoBST(root.right, val)
        return root

# @solution iterative-bst-insert accept
class Solution:
    def insertIntoBST(self, root, val):
        if root is None: return TreeNode(val)
        node = root
        while True:
            if val < node.val:
                if node.left is None:
                    node.left = TreeNode(val); break
                node = node.left
            else:
                if node.right is None:
                    node.right = TreeNode(val); break
                node = node.right
        return root
