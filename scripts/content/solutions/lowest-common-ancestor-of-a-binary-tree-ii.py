# @solution count-found-postorder accept
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        found = 0
        def dfs(node):
            nonlocal found
            if node is None:
                return None
            left = dfs(node.left)
            right = dfs(node.right)
            if node is p or node is q:
                found += 1
                return node
            if left and right:
                return node
            return left or right
        answer = dfs(root)
        return answer if found == 2 else None

# @solution parent-map-membership accept
class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        parent = {root: None}
        stack = [root]
        while stack:
            node = stack.pop()
            for child in (node.left, node.right):
                if child:
                    parent[child] = node
                    stack.append(child)
        if p not in parent or q not in parent:
            return None
        ancestors = set()
        while p:
            ancestors.add(p)
            p = parent[p]
        while q not in ancestors:
            q = parent[q]
        return q

# @solution assumes-both-exist reject
class Solution:
    def lowestCommonAncestor(self, root, p, q):
        def dfs(node):
            if node is None or node is p or node is q:
                return node
            left, right = dfs(node.left), dfs(node.right)
            return node if left and right else left or right
        return dfs(root)
