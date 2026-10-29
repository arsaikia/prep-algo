# @solution per-key-binary-search accept
from bisect import bisect_right

class TimeMap:
    def __init__(self):
        self.data = {}

    def set(self, key, value, timestamp):
        self.data.setdefault(key, []).append((timestamp, value))

    def get(self, key, timestamp):
        entries = self.data.get(key, [])
        index = bisect_right(entries, (timestamp, chr(0x10ffff))) - 1
        return entries[index][1] if index >= 0 else ""

# @solution parallel-timestamp-value-arrays accept
class TimeMap:
    def __init__(self):
        self.times = {}
        self.values = {}

    def set(self, key, value, timestamp):
        self.times.setdefault(key, []).append(timestamp)
        self.values.setdefault(key, []).append(value)

    def get(self, key, timestamp):
        times = self.times.get(key, [])
        left, right = 0, len(times)
        while left < right:
            middle = (left + right) // 2
            if times[middle] <= timestamp:
                left = middle + 1
            else:
                right = middle
        return self.values[key][left - 1] if left else ""

# @solution linear-history-scan tle
class TimeMap:
    def __init__(self):
        self.data = {}

    def set(self, key, value, timestamp):
        self.data.setdefault(key, []).append((timestamp, value))

    def get(self, key, timestamp):
        result = ""
        for stored_time, value in self.data.get(key, []):
            if stored_time > timestamp:
                break
            result = value
        return result
