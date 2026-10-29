# @solution iterative-merge accept
class Solution:
    def mergeTwoLists(self, list1, list2):
        dummy = tail = ListNode()
        while list1 and list2:
            if list1.val <= list2.val:
                tail.next = list1; list1 = list1.next
            else:
                tail.next = list2; list2 = list2.next
            tail = tail.next
        tail.next = list1 or list2
        return dummy.next

# @solution recursive-merge accept
class Solution:
    def mergeTwoLists(self, list1, list2):
        if list1 is None:
            return list2
        if list2 is None:
            return list1
        if list1.val <= list2.val:
            list1.next = self.mergeTwoLists(list1.next, list2)
            return list1
        list2.next = self.mergeTwoLists(list1, list2.next)
        return list2

# @solution returns-first-list reject
class Solution:
    def mergeTwoLists(self, list1, list2):
        return list1 if list1 else list2
