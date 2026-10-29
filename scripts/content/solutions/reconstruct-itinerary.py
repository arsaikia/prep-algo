# @solution min-heap-hierholzer accept
import heapq
from collections import Counter, defaultdict
from typing import List

class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        graph = defaultdict(list)
        for src, dst in tickets:
            heapq.heappush(graph[src], dst)
        route = []
        def visit(airport):
            while graph[airport]:
                visit(heapq.heappop(graph[airport]))
            route.append(airport)
        visit("JFK")
        route.reverse()
        if len(route) != len(tickets) + 1:
            return []
        available = Counter(map(tuple, tickets))
        for edge in zip(route, route[1:]):
            if available[edge] == 0:
                return []
            available[edge] -= 1
        return route

# @solution sorted-adjacency-hierholzer accept
from collections import Counter, defaultdict
from typing import List

class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        graph = defaultdict(list)
        for src, dst in tickets:
            graph[src].append(dst)
        for src in graph:
            graph[src].sort(reverse=True)
        route = []
        stack = ["JFK"]
        while stack:
            while graph[stack[-1]]:
                stack.append(graph[stack[-1]].pop())
            route.append(stack.pop())
        route.reverse()
        if len(route) != len(tickets) + 1:
            return []
        available = Counter(map(tuple, tickets))
        for edge in zip(route, route[1:]):
            if available[edge] == 0:
                return []
            available[edge] -= 1
        return route
