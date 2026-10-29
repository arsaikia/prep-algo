# @solution prim-dense accept
from typing import List

class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        if n < 2:
            return 0
        used = [False] * n
        best = [float('inf')] * n
        best[0] = 0
        total = 0
        for _ in range(n):
            u = min((i for i in range(n) if not used[i]), key=lambda i: best[i])
            used[u] = True
            total += best[u]
            x, y = points[u]
            for v, (a, b) in enumerate(points):
                if not used[v]:
                    best[v] = min(best[v], abs(x - a) + abs(y - b))
        return total

# @solution kruskal accept
from typing import List

class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        edges = []
        for i in range(n):
            for j in range(i + 1, n):
                edges.append((abs(points[i][0] - points[j][0]) + abs(points[i][1] - points[j][1]), i, j))
        edges.sort()
        parent = list(range(n))
        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x
        total = count = 0
        for weight, a, b in edges:
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb
                total += weight
                count += 1
                if count == n - 1:
                    break
        return total

# @solution sum-distances-from-first reject
from typing import List

class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        if not points:
            return 0
        return sum(abs(points[0][0] - x) + abs(points[0][1] - y) for x, y in points[1:])
