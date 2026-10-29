# @solution recursive-format accept
class Solution:
    def tree2str(self, root):
        import sys
        sys.setrecursionlimit(max(sys.getrecursionlimit(), 20000))
        if root is None:
            return ''
        if root.left is None and root.right is None:
            return str(root.val)
        if root.right is None:
            return str(root.val) + '(' + self._format(root.left) + ')'
        return str(root.val) + '(' + self._format(root.left) + ')(' + self._format(root.right) + ')'

    def _format(self, node):
        if node is None:
            return ''
        if node.left is None and node.right is None:
            return str(node.val)
        if node.right is None:
            return str(node.val) + '(' + self._format(node.left) + ')'
        return str(node.val) + '(' + self._format(node.left) + ')(' + self._format(node.right) + ')'

# @solution iterative-token-format accept
class Solution:
    def tree2str(self, root):
        if root is None:
            return ''
        output = []
        stack = [('node', root)]
        while stack:
            kind, value = stack.pop()
            if kind == 'text':
                output.append(value)
                continue
            node = value
            output.append(str(node.val))
            parts = []
            if node.left is not None:
                parts.extend([('text', '('), ('node', node.left), ('text', ')')])
            elif node.right is not None:
                parts.extend([('text', '('), ('text', ''), ('text', ')')])
            if node.right is not None:
                parts.extend([('text', '('), ('node', node.right), ('text', ')')])
            stack.extend(reversed(parts))
        return ''.join(output)
