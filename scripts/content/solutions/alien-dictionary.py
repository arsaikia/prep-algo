# @solution kahn-min-heap accept
from typing import List
import heapq
class Solution:
    def alienOrder(self, words: List[str]) -> str:
        chars = set(''.join(words))
        adj = {c: set() for c in chars}
        indegree = {c: 0 for c in chars}
        for a, b in zip(words, words[1:]):
            if len(a) > len(b) and a.startswith(b):
                return ""
            for x, y in zip(a, b):
                if x != y:
                    if y not in adj[x]:
                        adj[x].add(y); indegree[y] += 1
                    break
        ready = [c for c in chars if indegree[c] == 0]
        heapq.heapify(ready)
        order = []
        while ready:
            c = heapq.heappop(ready); order.append(c)
            for nxt in sorted(adj[c]):
                indegree[nxt] -= 1
                if indegree[nxt] == 0: heapq.heappush(ready, nxt)
        return ''.join(order) if len(order) == len(chars) else ""

# @solution kahn-sorted-frontier accept
from typing import List
class Solution:
    def alienOrder(self, words: List[str]) -> str:
        chars = set(''.join(words)); edges = {c: set() for c in chars}; deg = dict.fromkeys(chars, 0)
        for a, b in zip(words, words[1:]):
            if len(a) > len(b) and a.startswith(b): return ""
            for x, y in zip(a, b):
                if x != y:
                    if y not in edges[x]: edges[x].add(y); deg[y] += 1
                    break
        ready = sorted(c for c in chars if deg[c] == 0); result = []
        while ready:
            c = ready.pop(0); result.append(c)
            for y in edges[c]:
                deg[y] -= 1
                if deg[y] == 0:
                    ready.append(y); ready.sort()
        return ''.join(result) if len(result) == len(chars) else ""

# @solution dfs-reverse-postorder accept
class Solution:
    def alienOrder(self, words: List[str]) -> str:
        graph = {c: set() for word in words for c in word}
        for a, b in zip(words, words[1:]):
            for x, y in zip(a, b):
                if x != y:
                    graph[x].add(y)
                    break
            else:
                if len(a) > len(b):
                    return ""
        state, order = {}, []
        def visit(c):
            state[c] = 1
            for d in graph[c]:
                if state.get(d) == 1:
                    return False
                if d not in state and not visit(d):
                    return False
            state[c] = 2
            order.append(c)
            return True
        for c in sorted(graph, reverse=True):
            if c not in state and not visit(c):
                return ""
        return "".join(reversed(order))

# @solution letters-in-first-seen-order reject
class Solution:
    def alienOrder(self, words):
        return "".join(dict.fromkeys("".join(words)))
