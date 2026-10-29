# @solution floyd-two-pointers accept
class Solution:
    def hasCycle(self, head) -> bool:
        slow = fast = head
        while fast and fast.next:
            slow = slow.next; fast = fast.next.next
            if slow is fast: return True
        return False

# @solution visited-node-set accept
class Solution:
    def hasCycle(self, head) -> bool:
        seen = set()
        while head:
            if head in seen: return True
            seen.add(head); head = head.next
        return False
