# @solution floyd-entry-detection accept
class Solution:
    def detectCycle(self, head):
        slow = fast = head
        while fast and fast.next:
            slow = slow.next; fast = fast.next.next
            if slow is fast:
                slow = head
                while slow is not fast: slow = slow.next; fast = fast.next
                return slow
        return None

# @solution visited-node-set accept
class Solution:
    def detectCycle(self, head):
        seen = set()
        while head and head not in seen:
            seen.add(head); head = head.next
        return head
