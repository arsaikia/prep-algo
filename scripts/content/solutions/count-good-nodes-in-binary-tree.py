# @solution depth-first-stack accept
class Solution:
    def goodNodes(self, root):
        if root is None:
            return 0
        count = 0
        stack = [(root, root.val)]
        while stack:
            node, maximum = stack.pop()
            if node.val >= maximum:
                count += 1
            maximum = max(maximum, node.val)
            if node.left:
                stack.append((node.left, maximum))
            if node.right:
                stack.append((node.right, maximum))
        return count

# @solution breadth-first-queue accept
class Solution:
    def goodNodes(self, root):
        if root is None:
            return 0
        queue = [(root, root.val)]
        head = 0
        count = 0
        while head < len(queue):
            node, maximum = queue[head]
            head += 1
            if node.val >= maximum:
                count += 1
            maximum = max(maximum, node.val)
            if node.left:
                queue.append((node.left, maximum))
            if node.right:
                queue.append((node.right, maximum))
        return count
