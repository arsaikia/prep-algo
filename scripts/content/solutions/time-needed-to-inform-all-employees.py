# @solution build-tree-depth-first-stack accept
class Solution:
    def numOfMinutes(self, n, headID, manager, informTime):
        children = [[] for _ in range(n)]
        for employee, boss in enumerate(manager):
            if boss != -1:
                children[boss].append(employee)
        answer = 0
        stack = [(headID, 0)]
        while stack:
            employee, elapsed = stack.pop()
            answer = max(answer, elapsed)
            for subordinate in children[employee]:
                stack.append((subordinate, elapsed + informTime[employee]))
        return answer

# @solution propagate-arrival-times-breadth-first accept
from collections import deque

class Solution:
    def numOfMinutes(self, n, headID, manager, informTime):
        children = [[] for _ in range(n)]
        for employee, boss in enumerate(manager):
            if boss != -1:
                children[boss].append(employee)
        arrival = [0] * n
        queue = deque([headID])
        answer = 0
        while queue:
            employee = queue.popleft()
            answer = max(answer, arrival[employee])
            for subordinate in children[employee]:
                arrival[subordinate] = arrival[employee] + informTime[employee]
                queue.append(subordinate)
        return answer
