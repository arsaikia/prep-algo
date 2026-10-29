# @solution frequency-buckets accept
class Solution:
    def topKFrequent(self, nums, k):
        counts = {}
        for value in nums:
            counts[value] = counts.get(value, 0) + 1
        buckets = [[] for _ in range(len(nums) + 1)]
        for value, frequency in counts.items():
            buckets[frequency].append(value)
        answer = []
        for frequency in range(len(buckets) - 1, 0, -1):
            answer.extend(buckets[frequency])
            if len(answer) >= k:
                return answer[:k]
        return answer

# @solution frequency-quickselect accept
class Solution:
    def topKFrequent(self, nums, k):
        counts = {}
        for value in nums:
            counts[value] = counts.get(value, 0) + 1
        items = list(counts.items())
        target = k - 1
        left, right = 0, len(items) - 1
        while left <= right:
            pivot_frequency = items[right][1]
            pivot = left
            for index in range(left, right):
                if items[index][1] > pivot_frequency:
                    items[pivot], items[index] = items[index], items[pivot]
                    pivot += 1
            items[pivot], items[right] = items[right], items[pivot]
            if pivot == target:
                break
            if pivot < target:
                left = pivot + 1
            else:
                right = pivot - 1
        return [value for value, _ in items[:k]]
