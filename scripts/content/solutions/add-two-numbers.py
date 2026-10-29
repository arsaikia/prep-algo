# @solution carry-loop accept
from typing import Optional
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        dummy = ListNode(0)
        tail, carry = dummy, 0
        while l1 or l2 or carry:
            total = carry + (l1.val if l1 else 0) + (l2.val if l2 else 0)
            carry, digit = divmod(total, 10)
            tail.next = ListNode(digit)
            tail = tail.next
            l1 = l1.next if l1 else None
            l2 = l2.next if l2 else None
        return dummy.next

# @solution recursive-digit-add accept
from typing import Optional
class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        def add(a, b, carry):
            if a is None and b is None and carry == 0:
                return None
            total = carry + (a.val if a else 0) + (b.val if b else 0)
            node = ListNode(total % 10)
            node.next = add(a.next if a else None, b.next if b else None, total // 10)
            return node
        return add(l1, l2, 0)
