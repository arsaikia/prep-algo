# @solution exponential-then-binary accept
class Solution:
    def search(self, reader, target: int) -> int:
        hi = 1
        while reader.get(hi) < target:
            hi *= 2
        lo = hi // 2
        while lo <= hi:
            mid = (lo + hi) // 2
            value = reader.get(mid)
            if value == target:
                return mid
            if value < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1

# @solution fixed-bound-binary accept
class Solution:
    def search(self, reader, target: int) -> int:
        lo, hi = 0, 10 ** 4
        while lo < hi:
            mid = (lo + hi) // 2
            if reader.get(mid) < target:
                lo = mid + 1
            else:
                hi = mid
        return lo if reader.get(lo) == target else -1

# @solution linear-scan reject
class Solution:
    def search(self, reader, target: int) -> int:
        i = 0
        while reader.get(i) != 2 ** 31 - 1:
            if reader.get(i) == target:
                return i
            i += 1
        return -1

# @solution doubling-off-by-one reject
class Solution:
    def search(self, reader, target: int) -> int:
        hi = 1
        while reader.get(hi) < target:
            hi *= 2
        lo = hi // 2 + 1
        while lo <= hi:
            mid = (lo + hi) // 2
            value = reader.get(mid)
            if value == target:
                return mid
            if value < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1
