# @solution monotonic-stack accept
class Solution:
    def dailyTemperatures(self, temperatures):
        answer = [0] * len(temperatures)
        stack = []
        for day, temperature in enumerate(temperatures):
            while stack and temperatures[stack[-1]] < temperature:
                previous = stack.pop()
                answer[previous] = day - previous
            stack.append(day)
        return answer

# @solution reverse-jump accept
class Solution:
    def dailyTemperatures(self, temperatures):
        n = len(temperatures)
        answer = [0] * n
        for day in range(n - 2, -1, -1):
            warmer = day + 1
            while warmer < n and temperatures[warmer] <= temperatures[day]:
                if answer[warmer] == 0:
                    warmer = n
                    break
                warmer += answer[warmer]
            if warmer < n:
                answer[day] = warmer - day
        return answer

# @solution scan-forward-for-each-day tle
class Solution:
    def dailyTemperatures(self, temperatures):
        answer = [0] * len(temperatures)
        for day, temperature in enumerate(temperatures):
            for warmer in range(day + 1, len(temperatures)):
                if temperatures[warmer] > temperature:
                    answer[day] = warmer - day
                    break
        return answer
# @solution treats-equal-as-warmer reject
class Solution:
    def dailyTemperatures(self, temperatures):
        answer = [0] * len(temperatures)
        stack = []
        for day, temperature in enumerate(temperatures):
            while stack and temperatures[stack[-1]] <= temperature:
                previous = stack.pop()
                answer[previous] = day - previous
            stack.append(day)
        return answer

