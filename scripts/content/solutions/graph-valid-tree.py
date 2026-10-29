# @solution disjoint-set-cycle-detection accept
class Solution:
    def validTree(self, n, edges):
        if len(edges) != n - 1: return False
        parent = list(range(n))
        def find(x):
            if parent[x] != x: parent[x] = find(parent[x])
            return parent[x]
        for a, b in edges:
            ra, rb = find(a), find(b)
            if ra == rb: return False
            parent[ra] = rb
        return True

# @solution breadth-first-connectivity accept
from collections import deque
class Solution:
    def validTree(self, n, edges):
        if len(edges) != n - 1: return False
        graph = [[] for _ in range(n)]
        for a, b in edges:
            graph[a].append(b); graph[b].append(a)
        seen = {0}
        queue = deque([0])
        while queue:
            for nxt in graph[queue.popleft()]:
                if nxt not in seen:
                    seen.add(nxt); queue.append(nxt)
        return len(seen) == n
