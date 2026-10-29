# @solution depth-first-search-counting-forward-edges accept
from typing import List

class Solution:
    def minReorder(self, n: int, connections: List[List[int]]) -> int:
        graph = [[] for _ in range(n)]
        for a, b in connections:
            graph[a].append((b, 1))
            graph[b].append((a, 0))
        seen = {0}
        stack = [0]
        changes = 0
        while stack:
            node = stack.pop()
            for neighbor, cost in graph[node]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    changes += cost
                    stack.append(neighbor)
        return changes

# @solution breadth-first-search-counting-forward-edges accept
from collections import deque
from typing import List

class Solution:
    def minReorder(self, n: int, connections: List[List[int]]) -> int:
        graph = [[] for _ in range(n)]
        for a, b in connections:
            graph[a].append((b, 1))
            graph[b].append((a, 0))
        seen = {0}
        queue = deque([0])
        answer = 0
        while queue:
            node = queue.popleft()
            for neighbor, cost in graph[node]:
                if neighbor not in seen:
                    seen.add(neighbor)
                    answer += cost
                    queue.append(neighbor)
        return answer
