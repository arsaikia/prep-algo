# @solution two-heaps accept
import heapq
class MedianFinder:
    def __init__(self):
        self.low = []
        self.high = []
    def addNum(self, num):
        heapq.heappush(self.low, -num)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))
    def findMedian(self):
        if len(self.low) > len(self.high): return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2.0

# @solution randomized-order-statistic-treap accept
class _MedianNode:
    def __init__(self, value, priority):
        self.value = value
        self.priority = priority
        self.count = self.size = 1
        self.left = self.right = None
class MedianFinder:
    def __init__(self):
        self.root = None
        self.seed = 2463534242
    def _size(self, node): return node.size if node else 0
    def _update(self, node): node.size = node.count + self._size(node.left) + self._size(node.right)
    def _rotate_right(self, node):
        top = node.left; node.left = top.right; top.right = node
        self._update(node); self._update(top); return top
    def _rotate_left(self, node):
        top = node.right; node.right = top.left; top.left = node
        self._update(node); self._update(top); return top
    def _insert(self, node, value):
        if node is None:
            self.seed ^= (self.seed << 13) & 0xFFFFFFFF
            self.seed ^= self.seed >> 17
            self.seed ^= (self.seed << 5) & 0xFFFFFFFF
            return _MedianNode(value, self.seed)
        if value == node.value: node.count += 1
        elif value < node.value:
            node.left = self._insert(node.left, value)
            if node.left.priority < node.priority: node = self._rotate_right(node)
        else:
            node.right = self._insert(node.right, value)
            if node.right.priority < node.priority: node = self._rotate_left(node)
        self._update(node)
        return node
    def addNum(self, num): self.root = self._insert(self.root, num)
    def _kth(self, k):
        node = self.root
        while node:
            left_size = self._size(node.left)
            if k < left_size: node = node.left
            elif k < left_size + node.count: return node.value
            else:
                k -= left_size + node.count
                node = node.right
    def findMedian(self):
        size = self._size(self.root)
        if size % 2: return float(self._kth(size // 2))
        return (self._kth(size // 2 - 1) + self._kth(size // 2)) / 2.0
