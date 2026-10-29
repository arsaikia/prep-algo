# @solution kahn-indegree accept
from collections import deque

class Solution:
    def canFinish(self, numCourses, prerequisites):
        graph = [[] for _ in range(numCourses)]
        indegree = [0] * numCourses
        for course, prereq in prerequisites:
            graph[prereq].append(course)
            indegree[course] += 1
        queue = deque(i for i, degree in enumerate(indegree) if degree == 0)
        completed = 0
        while queue:
            course = queue.popleft()
            completed += 1
            for following in graph[course]:
                indegree[following] -= 1
                if indegree[following] == 0:
                    queue.append(following)
        return completed == numCourses

# @solution iterative-dfs-colors accept
class Solution:
    def canFinish(self, numCourses, prerequisites):
        graph = [[] for _ in range(numCourses)]
        for course, prereq in prerequisites:
            graph[prereq].append(course)
        state = [0] * numCourses
        for start in range(numCourses):
            if state[start]:
                continue
            state[start] = 1
            stack = [(start, 0)]
            while stack:
                node, index = stack[-1]
                if index == len(graph[node]):
                    state[node] = 2
                    stack.pop()
                    continue
                neighbor = graph[node][index]
                stack[-1] = (node, index + 1)
                if state[neighbor] == 1:
                    return False
                if state[neighbor] == 0:
                    state[neighbor] = 1
                    stack.append((neighbor, 0))
        return True
# @solution always-feasible reject
class Solution:
    def canFinish(self, numCourses, prerequisites):
        return True

