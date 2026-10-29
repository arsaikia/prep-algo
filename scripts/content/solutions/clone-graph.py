# @solution dfs-map accept
class Solution:
    def cloneGraph(self, node):
        if node is None: return None
        copies = {}
        def clone(cur):
            if cur in copies: return copies[cur]
            fresh = Node(cur.val); copies[cur] = fresh
            fresh.neighbors = [clone(n) for n in cur.neighbors]
            return fresh
        return clone(node)

# @solution bfs-map accept
from collections import deque
class Solution:
    def cloneGraph(self, node):
        if node is None: return None
        copies = {node: Node(node.val)}; q = deque([node])
        while q:
            cur = q.popleft()
            for neighbor in cur.neighbors:
                if neighbor not in copies:
                    copies[neighbor] = Node(neighbor.val); q.append(neighbor)
                copies[cur].neighbors.append(copies[neighbor])
        return copies[node]
