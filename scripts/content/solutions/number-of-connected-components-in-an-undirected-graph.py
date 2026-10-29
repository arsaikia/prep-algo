# @solution depth-first-search accept
from typing import List

class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        graph = [[] for _ in range(n)]
        for a, b in edges:
            graph[a].append(b)
            graph[b].append(a)
        seen = set()
        count = 0
        for start in range(n):
            if start not in seen:
                count += 1
                stack = [start]
                seen.add(start)
                while stack:
                    node = stack.pop()
                    for neighbor in graph[node]:
                        if neighbor not in seen:
                            seen.add(neighbor)
                            stack.append(neighbor)
        return count

# @solution disjoint-set-union accept
from typing import List

class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        parent = list(range(n))
        rank = [1] * n
        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x
        count = n
        for a, b in edges:
            ra, rb = find(a), find(b)
            if ra != rb:
                if rank[ra] < rank[rb]:
                    ra, rb = rb, ra
                parent[rb] = ra
                rank[ra] += rank[rb]
                count -= 1
        return count

# @solution counts-edges-instead-of-components reject
from typing import List

class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        return n - len(edges)
