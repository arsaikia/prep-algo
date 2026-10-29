# @solution reachability-from-each-source accept
class Solution:
    def checkIfPrerequisite(self, numCourses, prerequisites, queries):
        graph = [[] for _ in range(numCourses)]
        for prereq, course in prerequisites:
            graph[prereq].append(course)
        reachable = []
        for source in range(numCourses):
            seen = set()
            stack = list(graph[source])
            while stack:
                node = stack.pop()
                if node in seen:
                    continue
                seen.add(node)
                stack.extend(graph[node])
            reachable.append(seen)
        return [a != b and b in reachable[a] for a, b in queries]

# @solution bitset-transitive-closure accept
class Solution:
    def checkIfPrerequisite(self, numCourses, prerequisites, queries):
        reachable = [0] * numCourses
        for prereq, course in prerequisites:
            reachable[prereq] |= 1 << course
        for middle in range(numCourses):
            bit = 1 << middle
            for source in range(numCourses):
                if reachable[source] & bit:
                    reachable[source] |= reachable[middle]
        return [a != b and bool(reachable[a] & (1 << b)) for a, b in queries]
