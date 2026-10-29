# @solution heap-merge accept
import heapq

class Solution:
    def mergeKLists(self, lists):
        heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
        heapq.heapify(heap)
        dummy = tail = ListNode()
        while heap:
            _, i, node = heapq.heappop(heap)
            tail.next = node
            tail = node
            if node.next:
                heapq.heappush(heap, (node.next.val, i, node.next))
        return dummy.next

# @solution divide-and-conquer accept
class Solution:
    def mergeKLists(self, lists):
        if not lists:
            return None
        lists = list(lists)
        step = 1
        while step < len(lists):
            for i in range(0, len(lists) - step, step * 2):
                lists[i] = self.merge(lists[i], lists[i + step])
            step *= 2
        return lists[0]

    def merge(self, a, b):
        dummy = tail = ListNode()
        while a and b:
            if a.val <= b.val:
                tail.next, a = a, a.next
            else:
                tail.next, b = b, b.next
            tail = tail.next
        tail.next = a or b
        return dummy.next

# @solution returns-first-list reject
class Solution:
    def mergeKLists(self, lists):
        return lists[0] if lists else None
