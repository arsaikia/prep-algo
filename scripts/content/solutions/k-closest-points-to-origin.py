# @solution sort-by-squared-distance accept
from typing import List
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        return sorted(points, key=lambda p: p[0]*p[0] + p[1]*p[1])[:k]

# @solution bounded-max-heap accept
import heapq
from typing import List
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        return [p for _, p in heapq.nsmallest(k, ((x*x+y*y, p) for p in points for x,y in [p]))]

# @solution sorts-by-x reject
from typing import List
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        return sorted(points)[:k]

# @solution repeated-minimum-scan tle
from typing import List
class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:
        remaining=points[:]; result=[]
        for _ in range(k):
            i=min(range(len(remaining)),key=lambda j:remaining[j][0]**2+remaining[j][1]**2)
            result.append(remaining.pop(i))
        return result
