# @solution iterative-group-reversal accept
from typing import Optional

class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        dummy = ListNode(0)
        dummy.next = head
        group_prev = dummy
        while True:
            kth = group_prev
            for _ in range(k):
                kth = kth.next
                if kth is None:
                    return dummy.next
            group_next = kth.next
            prev, current = group_next, group_prev.next
            while current is not group_next:
                following = current.next
                current.next = prev
                prev, current = current, following
            old_start = group_prev.next
            group_prev.next = kth
            group_prev = old_start

# @solution node-array-group-reversal accept
from typing import Optional

class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        nodes = []
        while head:
            nodes.append(head)
            head = head.next
        for start in range(0, len(nodes) - k + 1, k):
            nodes[start:start + k] = reversed(nodes[start:start + k])
        for i in range(len(nodes) - 1):
            nodes[i].next = nodes[i + 1]
        if nodes:
            nodes[-1].next = None
            return nodes[0]
        return None

# @solution reverses-short-final-group reject
from typing import Optional

class Solution:
    def reverseKGroup(self, head: Optional[ListNode], k: int) -> Optional[ListNode]:
        previous, current = None, head
        while current:
            following = current.next
            current.next = previous
            previous, current = current, following
        return previous
