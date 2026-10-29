# @solution identity-map accept
class Solution:
    def copyRandomList(self, head):
        if head is None:
            return None
        copies = {}
        current = head
        while current:
            copies[current] = RandomListNode(current.val)
            current = current.next
        current = head
        while current:
            copy = copies[current]
            copy.next = copies.get(current.next)
            copy.random = copies.get(current.random)
            current = current.next
        return copies[head]

# @solution interleave-and-unweave accept
class Solution:
    def copyRandomList(self, head):
        if head is None:
            return None
        current = head
        while current:
            copy = RandomListNode(current.val, current.next)
            current.next = copy
            current = copy.next
        current = head
        while current:
            if current.random:
                current.next.random = current.random.next
            current = current.next.next
        copy_head = head.next
        current = head
        while current:
            copy = current.next
            current.next = copy.next
            copy.next = copy.next.next if copy.next else None
            current = current.next
        return copy_head
# @solution returns-original-list reject
class Solution:
    def copyRandomList(self, head):
        return head

