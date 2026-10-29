# @solution one-row-dynamic-programming accept
class Solution:
    def uniquePaths(self, m, n):
        ways = [1] * n
        for _ in range(1, m):
            for col in range(1, n):
                ways[col] += ways[col - 1]
        return ways[-1]

# @solution binomial-coefficient accept
class Solution:
    def uniquePaths(self, m, n):
        total_steps = m + n - 2
        down_steps = min(m - 1, n - 1)
        answer = 1
        for i in range(1, down_steps + 1):
            answer = answer * (total_steps - down_steps + i) // i
        return answer

# @solution enumerate-every-route tle
class Solution:
    def uniquePaths(self, m, n):
        def count(row, col):
            if row == m - 1 and col == n - 1:
                return 1
            routes = 0
            if row + 1 < m:
                routes += count(row + 1, col)
            if col + 1 < n:
                routes += count(row, col + 1)
            return routes
        return count(0, 0)
