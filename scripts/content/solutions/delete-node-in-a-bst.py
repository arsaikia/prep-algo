# @solution recursive-successor-replacement accept
class Solution:
    def deleteNode(self, root, key):
        import sys
        sys.setrecursionlimit(max(sys.getrecursionlimit(), 20000))
        if root is None:
            return None
        if key < root.val:
            root.left = self.deleteNode(root.left, key)
        elif key > root.val:
            root.right = self.deleteNode(root.right, key)
        elif root.left is None:
            return root.right
        elif root.right is None:
            return root.left
        else:
            successor = root.right
            while successor.left:
                successor = successor.left
            root.val = successor.val
            root.right = self.deleteNode(root.right, successor.val)
        return root

# @solution iterative-successor-splice accept
class Solution:
    def deleteNode(self, root, key):
        parent = None
        node = root
        while node and node.val != key:
            parent = node
            node = node.left if key < node.val else node.right
        if node is None:
            return root
        if node.left and node.right:
            successor_parent = node
            successor = node.right
            while successor.left:
                successor_parent = successor
                successor = successor.left
            node.val = successor.val
            parent, node = successor_parent, successor
        replacement = node.left if node.left else node.right
        if parent is None:
            return replacement
        if parent.left is node:
            parent.left = replacement
        else:
            parent.right = replacement
        return root

# @solution predecessor-replacement accept
class Solution:
    def deleteNode(self, root: Optional[TreeNode], key: int) -> Optional[TreeNode]:
        if root is None:
            return None
        if key < root.val:
            root.left = self.deleteNode(root.left, key)
        elif key > root.val:
            root.right = self.deleteNode(root.right, key)
        else:
            if root.left is None:
                return root.right
            if root.right is None:
                return root.left
            pred = root.left
            while pred.right:
                pred = pred.right
            root.val = pred.val
            root.left = self.deleteNode(root.left, pred.val)
        return root

# @solution drops-whole-subtree reject
class Solution:
    def deleteNode(self, root, key):
        if root is None:
            return None
        if root.val == key:
            return None
        if key < root.val:
            root.left = self.deleteNode(root.left, key)
        else:
            root.right = self.deleteNode(root.right, key)
        return root
