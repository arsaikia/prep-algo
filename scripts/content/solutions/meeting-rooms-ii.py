# @solution min-heap accept
from typing import List
import heapq

class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        if not intervals:
            return 0
        busy = []
        for start, end in sorted(intervals):
            if busy and busy[0] <= start:
                heapq.heappop(busy)
            heapq.heappush(busy, end)
        return len(busy)

# @solution endpoint-sweep accept
from typing import List

class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        events = []
        for start, end in intervals:
            events.append((start, 1)); events.append((end, -1))
        active = best = 0
        for _, delta in sorted(events):
            active += delta
            best = max(best, active)
        return best

# @solution count-intervals reject
from typing import List

class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        return len(intervals)
