# @solution topological-color-dp accept
from collections import deque
from typing import List
class Solution:
    def largestPathValue(self, colors: str, edges: List[List[int]]) -> int:
        n = len(colors)
        graph = [[] for _ in range(n)]
        indegree = [0] * n
        for a,b in edges:
            graph[a].append(b); indegree[b] += 1
        dp = [[0] * 26 for _ in range(n)]
        q = deque(i for i in range(n) if indegree[i] == 0)
        seen = best = 0
        while q:
            u = q.popleft(); seen += 1
            c = ord(colors[u]) - 97
            dp[u][c] += 1; best = max(best, dp[u][c])
            for v in graph[u]:
                for j in range(26): dp[v][j] = max(dp[v][j], dp[u][j])
                indegree[v] -= 1
                if indegree[v] == 0: q.append(v)
        return best if seen == n else -1

# @solution iterative-dfs-color-dp accept
from typing import List
class Solution:
    def largestPathValue(self, colors: str, edges: List[List[int]]) -> int:
        n = len(colors)
        graph = [[] for _ in range(n)]
        for a,b in edges: graph[a].append(b)
        state = [0] * n
        dp = [[0] * 26 for _ in range(n)]
        best = 0
        for start in range(n):
            if state[start] == 2: continue
            stack = [(start, 0)]
            while stack:
                u, phase = stack.pop()
                if phase == 0:
                    if state[u] == 1: return -1
                    if state[u] == 2: continue
                    state[u] = 1
                    stack.append((u, 1))
                    for v in graph[u]:
                        if state[v] == 1: return -1
                        if state[v] == 0: stack.append((v, 0))
                else:
                    c = ord(colors[u]) - 97
                    for v in graph[u]:
                        for j in range(26): dp[u][j] = max(dp[u][j], dp[v][j])
                    dp[u][c] += 1
                    best = max(best, dp[u][c]); state[u] = 2
        return best

# @solution enumerates-all-paths tle
from typing import List
class Solution:
    def largestPathValue(self, colors: str, edges: List[List[int]]) -> int:
        graph = [[] for _ in colors]
        for a,b in edges: graph[a].append(b)
        active = set()
        best = 0
        def walk(u, counts):
            nonlocal best
            if u in active: raise ValueError('cycle')
            active.add(u)
            c = ord(colors[u]) - 97
            counts[c] += 1; best = max(best, counts[c])
            for v in graph[u]: walk(v, counts)
            counts[c] -= 1; active.remove(u)
        try:
            for i in range(len(colors)): walk(i, [0] * 26)
        except ValueError: return -1
        return best
