# @solution recursive-flip-matching accept
import sys
sys.setrecursionlimit(20000)
class Solution:
    def flipEquiv(self, root1, root2):
        def same(a, b):
            if a is None or b is None: return a is b
            if a.val != b.val: return False
            return (same(a.left, b.left) and same(a.right, b.right)) or (same(a.left, b.right) and same(a.right, b.left))
        return same(root1, root2)

# @solution canonical-sorted-children accept
import sys
sys.setrecursionlimit(20000)
class Solution:
    def flipEquiv(self, root1, root2):
        def form(node):
            if node is None: return None
            children = sorted((form(node.left), form(node.right)), key=repr)
            return node.val, children[0], children[1]
        return form(root1) == form(root2)
