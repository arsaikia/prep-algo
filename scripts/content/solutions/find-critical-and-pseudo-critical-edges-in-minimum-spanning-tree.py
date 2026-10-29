# @solution kruskal-force-and-skip accept
class Solution:
    def findCriticalAndPseudoCriticalEdges(self, n, edges):
        tagged = sorted((w, i, u, v) for i, (u, v, w) in enumerate(edges))
        def mst(skip=-1, force=-1):
            parent = list(range(n))
            size = [1] * n
            def find(x):
                while parent[x] != x:
                    parent[x] = parent[parent[x]]
                    x = parent[x]
                return x
            cost = 0
            used = 0
            if force >= 0:
                w, i, u, v = next(e for e in tagged if e[1] == force)
                a, b = find(u), find(v)
                if a != b:
                    parent[a] = b
                    cost += w
                    used += 1
            for w, i, u, v in tagged:
                if i == skip or i == force:
                    continue
                a, b = find(u), find(v)
                if a == b:
                    continue
                if size[a] < size[b]:
                    a, b = b, a
                parent[b] = a
                size[a] += size[b]
                cost += w
                used += 1
            return cost if used == n - 1 else float('inf')
        baseline = mst()
        if baseline == float('inf'): return [[], []]
        critical, pseudo = [], []
        for i in range(len(edges)):
            if mst(skip=i) > baseline:
                critical.append(i)
            elif mst(force=i) == baseline:
                pseudo.append(i)
        return [critical, pseudo]

# @solution equal-weight-bridge-classification accept
class Solution:
    def findCriticalAndPseudoCriticalEdges(self, n, edges):
        ordered = sorted((w, i, u, v) for i, (u, v, w) in enumerate(edges))
        parent = list(range(n))
        size = [1] * n
        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x
        critical, pseudo = set(), set()
        index = 0
        while index < len(ordered):
            end = index
            while end < len(ordered) and ordered[end][0] == ordered[index][0]: end += 1
            candidates = []
            graph = {}
            for weight, edge_id, u, v in ordered[index:end]:
                a, b = find(u), find(v)
                if a == b: continue
                candidates.append(edge_id)
                graph.setdefault(a, []).append((b, edge_id))
                graph.setdefault(b, []).append((a, edge_id))
            discovered, low = {}, {}
            bridges = set()
            clock = 0
            def visit(node, parent_edge):
                nonlocal clock
                discovered[node] = low[node] = clock
                clock += 1
                for neighbor, edge_id in graph[node]:
                    if edge_id == parent_edge: continue
                    if neighbor not in discovered:
                        visit(neighbor, edge_id)
                        low[node] = min(low[node], low[neighbor])
                        if low[neighbor] > discovered[node]: bridges.add(edge_id)
                    else:
                        low[node] = min(low[node], discovered[neighbor])
            for node in graph:
                if node not in discovered: visit(node, -1)
            critical.update(bridges)
            pseudo.update(set(candidates) - bridges)
            for weight, edge_id, u, v in ordered[index:end]:
                a, b = find(u), find(v)
                if a != b:
                    if size[a] < size[b]: a, b = b, a
                    parent[b] = a; size[a] += size[b]
            index = end
        if len({find(vertex) for vertex in range(n)}) > 1:
            return [[], []]
        return [sorted(critical), sorted(pseudo)]
