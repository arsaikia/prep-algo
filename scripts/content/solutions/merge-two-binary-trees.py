# @solution depth-first-pair-stack accept
class Solution:
    def mergeTrees(self, root1, root2):
        if root1 is None:
            return root2
        stack = [(root1, root2)]
        while stack:
            first, second = stack.pop()
            if second is None:
                continue
            first.val += second.val
            if second.left is not None:
                if first.left is None:
                    first.left = second.left
                else:
                    stack.append((first.left, second.left))
            if second.right is not None:
                if first.right is None:
                    first.right = second.right
                else:
                    stack.append((first.right, second.right))
        return root1

# @solution iterative-merge accept
class Solution:
    def mergeTrees(self, root1, root2):
        if root1 is None:
            return root2
        stack = [(root1, root2)]
        while stack:
            first, second = stack.pop()
            if second is None:
                continue
            first.val += second.val
            if first.left is None:
                first.left = second.left
            else:
                stack.append((first.left, second.left))
            if first.right is None:
                first.right = second.right
            else:
                stack.append((first.right, second.right))
        return root1

# @solution returns-first-tree reject
class Solution:
    def mergeTrees(self, root1, root2):
        return root1
