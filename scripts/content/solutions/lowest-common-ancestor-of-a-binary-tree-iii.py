# @solution ancestor-set accept
class Solution:
    def lowestCommonAncestor(self, p: 'Node', q: 'Node') -> 'Node':
        seen = set()
        while p:
            seen.add(p)
            p = p.parent
        while q not in seen:
            q = q.parent
        return q

# @solution two-pointer-switch accept
class Solution:
    def lowestCommonAncestor(self, p: 'Node', q: 'Node') -> 'Node':
        a, b = p, q
        while a is not b:
            a = a.parent if a.parent else q
            b = b.parent if b.parent else p
        return a

# @solution returns-p reject
class Solution:
    def lowestCommonAncestor(self, p, q):
        return p
