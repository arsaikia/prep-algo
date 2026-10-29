# @solution dijkstra-heap accept
from typing import List
import heapq

class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        graph = [[] for _ in range(n + 1)]
        for u, v, w in times:
            graph[u].append((v, w))
        distances = [float('inf')] * (n + 1)
        distances[k] = 0
        heap = [(0, k)]
        while heap:
            distance, node = heapq.heappop(heap)
            if distance != distances[node]:
                continue
            for neighbor, weight in graph[node]:
                candidate = distance + weight
                if candidate < distances[neighbor]:
                    distances[neighbor] = candidate
                    heapq.heappush(heap, (candidate, neighbor))
        answer = max(distances[1:])
        return -1 if answer == float('inf') else answer

# @solution bellman-ford accept
from typing import List

class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        distances = [float('inf')] * (n + 1)
        distances[k] = 0
        for _ in range(n - 1):
            changed = False
            for u, v, weight in times:
                if distances[u] != float('inf') and distances[u] + weight < distances[v]:
                    distances[v] = distances[u] + weight
                    changed = True
            if not changed:
                break
        answer = max(distances[1:])
        return -1 if answer == float('inf') else answer

# @solution one-edge-only reject
from typing import List

class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        if n == 1:
            return 0
        outgoing = {u: w for u, v, w in times if u == k}
        return max(outgoing.values()) if len(outgoing) == n - 1 else -1
