# @solution walk-down-bst accept
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        node = root
        while node:
            if p.val < node.val and q.val < node.val:
                node = node.left
            elif p.val > node.val and q.val > node.val:
                node = node.right
            else:
                return node

# @solution generic-binary-tree-lca accept
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        def dfs(node):
            if node is None or node is p or node is q:
                return node
            left, right = dfs(node.left), dfs(node.right)
            return node if left and right else left or right
        return dfs(root)

# @solution returns-root-always reject
class Solution:
    def lowestCommonAncestor(self, root, p, q):
        return root
