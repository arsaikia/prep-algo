# @solution greedy-total-and-current accept
class Solution:
    def canCompleteCircuit(self, gas, cost):
        total = current = start = 0
        for i, (g, c) in enumerate(zip(gas, cost)):
            delta = g - c
            total += delta
            current += delta
            if current < 0:
                current = 0
                start = i + 1
        return start if total >= 0 else -1

# @solution prefix-minimum-start accept
class Solution:
    def canCompleteCircuit(self, gas, cost):
        balance = [g - c for g, c in zip(gas, cost)]
        if sum(balance) < 0: return -1
        prefix = start = 0
        lowest = 0
        for i, value in enumerate(balance):
            prefix += value
            if prefix < lowest:
                lowest, start = prefix, i + 1
        return start % len(gas)

# @solution quadratic-start-simulation tle
class Solution:
    def canCompleteCircuit(self, gas, cost):
        n = len(gas)
        for start in range(n):
            fuel = 0
            for offset in range(n):
                index = (start + offset) % n
                fuel += gas[index] - cost[index]
                if fuel < 0: break
            else: return start
        return -1
