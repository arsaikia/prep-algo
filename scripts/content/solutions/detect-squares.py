# @solution coordinate-frequency-map accept
from collections import Counter

class DetectSquares:
    def __init__(self):
        self.points = Counter()

    def add(self, point):
        self.points[tuple(point)] += 1

    def count(self, point):
        x, y = point
        total = 0
        for (other_x, other_y), multiplicity in self.points.items():
            side = other_y - y
            if side and abs(other_x - x) == abs(side):
                total += multiplicity * self.points[(x, other_y)] * self.points[(other_x, y)]
        return total

# @solution x-coordinate-buckets accept
class DetectSquares:
    def __init__(self):
        self.columns = {}

    def add(self, point):
        x, y = point
        column = self.columns.setdefault(x, {})
        column[y] = column.get(y, 0) + 1

    def count(self, point):
        x, y = point
        total = 0
        for other_x, column in self.columns.items():
            side = other_x - x
            if side == 0:
                continue
            for other_y, count_corner in column.items():
                vertical = other_y - y
                if abs(vertical) != abs(side):
                    continue
                total += count_corner * column.get(y, 0) * self.columns.get(x, {}).get(other_y, 0)
        return total
# @solution ignores-duplicate-points reject
class DetectSquares:
    def __init__(self):
        self.points = set()
    def add(self, point):
        self.points.add(tuple(point))
    def count(self, point):
        x, y = point
        total = 0
        for other_x, other_y in self.points:
            side = other_y - y
            if side and abs(other_x - x) == abs(side):
                total += ((x, other_y) in self.points) and ((other_x, y) in self.points)
        return total

