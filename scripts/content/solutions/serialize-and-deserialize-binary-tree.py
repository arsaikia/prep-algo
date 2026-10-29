# @solution preorder-with-markers accept
class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out, stack = [], [root]
        while stack:
            node = stack.pop()
            if node is None:
                out.append('#')
            else:
                out.append(str(node.val))
                stack.append(node.right)
                stack.append(node.left)
        return ','.join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        tokens = iter(data.split(','))
        def build():
            token = next(tokens)
            if token == '#':
                return None
            node = TreeNode(int(token))
            node.left = build()
            node.right = build()
            return node
        return build()

# @solution level-order accept
from collections import deque

class Codec:
    def serialize(self, root: Optional[TreeNode]) -> str:
        out, queue = [], deque([root])
        while queue:
            node = queue.popleft()
            if node:
                out.append(str(node.val))
                queue.append(node.left)
                queue.append(node.right)
            else:
                out.append('null')
        return ' '.join(out)

    def deserialize(self, data: str) -> Optional[TreeNode]:
        values = data.split()
        if values[0] == 'null':
            return None
        root = TreeNode(int(values[0]))
        queue, i = deque([root]), 1
        while queue:
            node = queue.popleft()
            for side in ('left', 'right'):
                if values[i] != 'null':
                    child = TreeNode(int(values[i]))
                    setattr(node, side, child)
                    queue.append(child)
                i += 1
        return root

# @solution values-only-loses-shape reject
class Codec:
    def serialize(self, root):
        out = []
        def walk(node):
            if node:
                walk(node.left)
                out.append(str(node.val))
                walk(node.right)
        walk(root)
        return ','.join(out)

    def deserialize(self, data):
        root = None
        for token in reversed(data.split(',') if data else []):
            root = TreeNode(int(token), None, root)
        return root
