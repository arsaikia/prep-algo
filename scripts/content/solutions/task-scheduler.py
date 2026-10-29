# @solution frequency-frame-formula accept
from collections import Counter

class Solution:
    def leastInterval(self, tasks, n):
        if not tasks:
            return 0
        counts = Counter(tasks)
        highest = max(counts.values())
        tied = sum(count == highest for count in counts.values())
        return max(len(tasks), (highest - 1) * (n + 1) + tied)

# @solution max-heap-cooldown-simulation accept
import heapq
from collections import Counter, deque

class Solution:
    def leastInterval(self, tasks, n):
        available = [-count for count in Counter(tasks).values()]
        heapq.heapify(available)
        cooling = deque()
        time = 0
        while available or cooling:
            time += 1
            while cooling and cooling[0][0] <= time:
                _, remaining = cooling.popleft()
                heapq.heappush(available, remaining)
            if available:
                remaining = heapq.heappop(available) + 1
                if remaining:
                    cooling.append((time + n + 1, remaining))
        return time
