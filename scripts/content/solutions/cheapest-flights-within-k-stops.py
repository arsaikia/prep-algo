# @solution bounded-bellman-ford accept
from typing import List
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        inf = 10**30; cost = [inf]*n; cost[src] = 0
        for _ in range(k+1):
            nxt = cost[:]
            for a,b,w in flights:
                if cost[a] < inf: nxt[b] = min(nxt[b], cost[a]+w)
            cost = nxt
        return -1 if cost[dst] == inf else cost[dst]

# @solution layered-dijkstra accept
from typing import List
import heapq
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        adj = [[] for _ in range(n)]
        for a,b,w in flights: adj[a].append((b,w))
        heap = [(0,src,0)]; best = {}
        while heap:
            price, node, edges = heapq.heappop(heap)
            if node == dst: return price
            if edges == k+1: continue
            if best.get((node,edges), float('inf')) <= price: continue
            best[(node,edges)] = price
            for nxt,w in adj[node]: heapq.heappush(heap,(price+w,nxt,edges+1))
        return -1

# @solution enumerate-all-routes tle
from typing import List
class Solution:
    def findCheapestPrice(self, n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
        graph = [[] for _ in range(n)]
        for a,b,cost in flights: graph[a].append((b,cost))
        best = [float('inf')]
        def visit(node, edges, cost):
            if node == dst:
                best[0] = min(best[0], cost); return
            if edges == k+1: return
            for nxt, price in graph[node]: visit(nxt, edges+1, cost+price)
        visit(src,0,0)
        return -1 if best[0] == float('inf') else best[0]
