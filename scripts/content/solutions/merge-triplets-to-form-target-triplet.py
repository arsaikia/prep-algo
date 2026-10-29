# @solution compatible-coordinate-maxima accept
from typing import List

class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        best = [0, 0, 0]
        for triplet in triplets:
            if all(triplet[i] <= target[i] for i in range(3)):
                for i in range(3):
                    best[i] = max(best[i], triplet[i])
        return best == target

# @solution collect-coordinate-flags accept
from typing import List

class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        reached = [False, False, False]
        for a, b, c in triplets:
            if a <= target[0] and b <= target[1] and c <= target[2]:
                reached[0] |= a == target[0]
                reached[1] |= b == target[1]
                reached[2] |= c == target[2]
        return all(reached)

# @solution ignores-incompatible-triplets reject
from typing import List

class Solution:
    def mergeTriplets(self, triplets: List[List[int]], target: List[int]) -> bool:
        return all(any(t[i] == target[i] for t in triplets) for i in range(3))
