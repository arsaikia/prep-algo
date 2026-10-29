# @solution recursive-midpoint accept
class Solution:
    def sortedArrayToBST(self, nums):
        def build(left, right):
            if left > right:
                return None
            middle = (left + right) // 2
            node = TreeNode(nums[middle])
            node.left = build(left, middle - 1)
            node.right = build(middle + 1, right)
            return node
        return build(0, len(nums) - 1)

# @solution iterative-midpoint accept
class Solution:
    def sortedArrayToBST(self, nums):
        if not nums:
            return None
        root = TreeNode(0)
        stack = [(root, 0, len(nums) - 1)]
        while stack:
            node, left, right = stack.pop()
            middle = (left + right) // 2
            node.val = nums[middle]
            if left <= middle - 1:
                node.left = TreeNode(0)
                stack.append((node.left, left, middle - 1))
            if middle + 1 <= right:
                node.right = TreeNode(0)
                stack.append((node.right, middle + 1, right))
        return root

# @solution right-middle-root accept
class Solution:
    def sortedArrayToBST(self, nums: List[int]) -> Optional[TreeNode]:
        def build(lo, hi):
            if lo > hi:
                return None
            mid = (lo + hi + 1) // 2
            return TreeNode(nums[mid], build(lo, mid - 1), build(mid + 1, hi))
        return build(0, len(nums) - 1)

# @solution right-leaning-chain reject
class Solution:
    def sortedArrayToBST(self, nums):
        root = None
        for value in reversed(nums):
            root = TreeNode(value, None, root)
        return root
