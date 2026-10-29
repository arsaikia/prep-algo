# @solution linear-merge-pass accept
class Solution:
    def insert(self, intervals, newInterval):
        start, end = newInterval
        out = []
        i = 0
        while i < len(intervals) and intervals[i][1] < start:
            out.append(intervals[i]); i += 1
        while i < len(intervals) and intervals[i][0] <= end:
            start = min(start, intervals[i][0]); end = max(end, intervals[i][1]); i += 1
        out.append([start, end])
        out.extend(intervals[i:])
        return out

# @solution append-sort-and-coalesce accept
class Solution:
    def insert(self, intervals, newInterval):
        ordered = sorted(intervals + [newInterval])
        out = []
        for left, right in ordered:
            if not out or left > out[-1][1]: out.append([left, right])
            else: out[-1][1] = max(out[-1][1], right)
        return out
