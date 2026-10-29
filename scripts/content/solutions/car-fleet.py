# @solution sorted-time-stack accept
from typing import List
class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        cars = sorted(zip(position, speed), reverse=True); fleets = 0; last = -1
        for p, s in cars:
            time = (target-p)/s
            if time > last: fleets += 1; last = time
        return fleets

# @solution sorted-time-count accept
from typing import List
class Solution:
    def carFleet(self, target: int, position: List[int], speed: List[int]) -> int:
        cars = sorted(zip(position, speed), reverse=True)
        fleets = 0; lead = -1
        for p, speed_value in cars:
            t = (target-p)/speed_value
            if t > lead: fleets += 1; lead = t
        return fleets
