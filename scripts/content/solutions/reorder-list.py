# @solution midpoint-reverse-and-weave accept
from typing import Optional

class Solution:
    def reorderList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        if head is None or head.next is None:
            return head
        slow, fast = head, head
        while fast.next and fast.next.next:
            slow = slow.next
            fast = fast.next.next
        second = slow.next
        slow.next = None
        previous = None
        while second:
            following = second.next
            second.next = previous
            previous, second = second, following
        first, second = head, previous
        while second:
            first_next, second_next = first.next, second.next
            first.next = second
            second.next = first_next
            first, second = first_next, second_next
        return head

# @solution node-array-relinking accept
from typing import Optional

class Solution:
    def reorderList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        nodes = []
        node = head
        while node:
            nodes.append(node)
            node = node.next
        left, right = 0, len(nodes) - 1
        while left < right:
            nodes[left].next = nodes[right]
            left += 1
            if left == right:
                break
            nodes[right].next = nodes[left]
            right -= 1
        if nodes:
            nodes[left].next = None
        return head
