# @solution recursive-interned-subtree-ids accept
import sys
sys.setrecursionlimit(20000)
class Solution:
    def findDuplicateSubtrees(self, root):
        intern = {}
        counts = {}
        result = []
        next_id = 1
        def visit(node):
            nonlocal next_id
            if node is None: return 0
            key = (node.val, visit(node.left), visit(node.right))
            if key not in intern:
                intern[key] = next_id
                next_id += 1
            subtree_id = intern[key]
            counts[subtree_id] = counts.get(subtree_id, 0) + 1
            if counts[subtree_id] == 2: result.append(node)
            return subtree_id
        visit(root)
        return [self._to_list(node) for node in result]
    def _to_list(self, root):
        from collections import deque
        out, queue = [], deque([root])
        while queue:
            node = queue.popleft()
            if node is None: out.append(None); continue
            out.append(node.val); queue.extend((node.left, node.right))
        while out and out[-1] is None: out.pop()
        return out

# @solution iterative-interned-subtree-ids accept
class Solution:
    def findDuplicateSubtrees(self, root):
        if root is None: return []
        intern, counts, ids, result = {}, {}, {}, []
        next_id = 1
        stack = [(root, False)]
        while stack:
            node, ready = stack.pop()
            if node is None: continue
            if not ready:
                stack.append((node, True))
                stack.append((node.right, False)); stack.append((node.left, False))
                continue
            key = (node.val, ids.get(node.left, 0), ids.get(node.right, 0))
            if key not in intern:
                intern[key] = next_id
                next_id += 1
            subtree_id = intern[key]
            ids[node] = subtree_id
            counts[subtree_id] = counts.get(subtree_id, 0) + 1
            if counts[subtree_id] == 2: result.append(node)
        from collections import deque
        out = []
        for root in result:
            values, queue = [], deque([root])
            while queue:
                node = queue.popleft()
                if node is None: values.append(None); continue
                values.append(node.val); queue.extend((node.left, node.right))
            while values and values[-1] is None: values.pop()
            out.append(values)
        return out
