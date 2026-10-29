# @solution sorted-frequency-consuming accept
from collections import Counter
class Solution:
    def isNStraightHand(self, hand, groupSize):
        if len(hand) % groupSize: return False
        counts = Counter(hand)
        for start in sorted(counts):
            amount = counts[start]
            if not amount: continue
            for value in range(start, start + groupSize):
                if counts[value] < amount: return False
                counts[value] -= amount
        return True

# @solution min-heap-group-starts accept
from collections import Counter
import heapq
class Solution:
    def isNStraightHand(self, hand, groupSize):
        if len(hand) % groupSize: return False
        counts = Counter(hand)
        heap = list(counts); heapq.heapify(heap)
        while heap:
            start = heap[0]
            amount = counts[start]
            for value in range(start, start + groupSize):
                if counts[value] < amount: return False
                counts[value] -= amount
            while heap and counts[heap[0]] == 0: heapq.heappop(heap)
        return True
