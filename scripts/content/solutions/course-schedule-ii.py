# @solution min-heap-kahn accept
import heapq

class Solution:
    def findOrder(self, numCourses, prerequisites):
        graph = [[] for _ in range(numCourses)]
        indegree = [0] * numCourses
        for course, prereq in prerequisites:
            graph[prereq].append(course)
            indegree[course] += 1
        ready = [course for course in range(numCourses) if indegree[course] == 0]
        heapq.heapify(ready)
        order = []
        while ready:
            course = heapq.heappop(ready)
            order.append(course)
            for following in graph[course]:
                indegree[following] -= 1
                if indegree[following] == 0:
                    heapq.heappush(ready, following)
        return order if len(order) == numCourses else []

# @solution sorted-ready-kahn accept
class Solution:
    def findOrder(self, numCourses, prerequisites):
        graph = [[] for _ in range(numCourses)]
        indegree = [0] * numCourses
        for course, prereq in prerequisites:
            graph[prereq].append(course)
            indegree[course] += 1
        ready = [course for course in range(numCourses) if indegree[course] == 0]
        order = []
        while ready:
            ready.sort(reverse=True)
            course = ready.pop()
            order.append(course)
            for following in graph[course]:
                indegree[following] -= 1
                if indegree[following] == 0:
                    ready.append(following)
        return order if len(order) == numCourses else []
# @solution ignores-cycles reject
class Solution:
    def findOrder(self, numCourses, prerequisites):
        return list(range(numCourses))


# @solution dfs-postorder-any-order accept
from collections import defaultdict

class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        graph = defaultdict(list)
        for course, before in prerequisites:
            graph[before].append(course)
        state = [0] * numCourses
        order = []
        for start in range(numCourses - 1, -1, -1):
            if state[start]:
                continue
            stack = [(start, iter(graph[start]))]
            state[start] = 1
            while stack:
                node, children = stack[-1]
                child = next(children, None)
                if child is None:
                    stack.pop()
                    state[node] = 2
                    order.append(node)
                elif state[child] == 1:
                    return []
                elif state[child] == 0:
                    state[child] = 1
                    stack.append((child, iter(graph[child])))
        return order[::-1]

# @solution sorted-courses-ignoring-prereqs reject
class Solution:
    def findOrder(self, numCourses, prerequisites):
        return list(range(numCourses))[::-1]
