# @solution sort-and-check accept
from typing import List

class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        intervals.sort(key=lambda interval: interval[0])
        return all(intervals[i][0] >= intervals[i - 1][1] for i in range(1, len(intervals)))

# @solution sorted-endpoints accept
from typing import List

class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        starts = sorted(start for start, _ in intervals)
        ends = sorted(end for _, end in intervals)
        return all(starts[i] >= ends[i - 1] for i in range(1, len(starts)))

# @solution always-true reject
from typing import List

class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        return True
