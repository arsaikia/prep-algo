# @solution bounded-min-heap accept
import heapq
class KthLargest:
    def __init__(self, k: int, nums: list[int]) -> None:
        self.k = k
        self.heap = nums[:]
        heapq.heapify(self.heap)
        while len(self.heap) > k:
            heapq.heappop(self.heap)
    def add(self, val: int) -> int:
        if len(self.heap) < self.k:
            heapq.heappush(self.heap, val)
        elif val > self.heap[0]:
            heapq.heapreplace(self.heap, val)
        return self.heap[0]

# @solution fenwick-value-counts accept
class KthLargest:
    def __init__(self, k: int, nums: list[int]) -> None:
        self.k = k
        self.tree = [0] * 20002
        self.count = 0
        for x in nums:
            self._add(x + 10001, 1)
            self.count += 1
    def _add(self, i: int, delta: int) -> None:
        while i < len(self.tree):
            self.tree[i] += delta
            i += i & -i
    def add(self, val: int) -> int:
        self._add(val + 10001, 1)
        self.count += 1
        rank = self.count - self.k + 1
        i = 0
        bit = 1 << 14
        while bit:
            nxt = i + bit
            if nxt < len(self.tree) and self.tree[nxt] < rank:
                i = nxt
                rank -= self.tree[nxt]
            bit >>= 1
        return i - 10000
