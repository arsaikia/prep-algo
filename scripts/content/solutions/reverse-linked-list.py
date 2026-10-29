# @solution iterative-links accept
from typing import Optional

class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        previous = None
        current = head
        while current:
            following = current.next
            current.next = previous
            previous = current
            current = following
        return previous

# @solution node-stack-relink accept
from typing import Optional

class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        nodes = []
        while head:
            nodes.append(head)
            head = head.next
        for i in range(len(nodes) - 1, 0, -1):
            nodes[i].next = nodes[i - 1]
        if nodes:
            nodes[0].next = None
            return nodes[-1]
        return None

# @solution returns-values-without-relinking reject
from typing import Optional

class Solution:
    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:
        values = []
        while head:
            values.append(head.val)
            head = head.next
        return ListNode(values[-1]) if values else None
