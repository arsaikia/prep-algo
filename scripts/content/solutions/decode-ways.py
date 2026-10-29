# @solution prefix-dynamic-programming accept
class Solution:
    def numDecodings(self, s):
        previous_two, previous_one = 1, int(s[0] != '0')
        for i in range(1, len(s)):
            current = 0
            if s[i] != '0':
                current += previous_one
            pair = int(s[i - 1:i + 1])
            if 10 <= pair <= 26:
                current += previous_two
            previous_two, previous_one = previous_one, current
        return previous_one

# @solution suffix-dynamic-programming accept
class Solution:
    def numDecodings(self, s):
        ways = [0] * (len(s) + 1)
        ways[len(s)] = 1
        for i in range(len(s) - 1, -1, -1):
            if s[i] == '0':
                continue
            ways[i] = ways[i + 1]
            if i + 1 < len(s) and 10 <= int(s[i:i + 2]) <= 26:
                ways[i] += ways[i + 2]
        return ways[0]

# @solution uncached-recursion tle
class Solution:
    def numDecodings(self, s):
        def count(index):
            if index == len(s):
                return 1
            if s[index] == '0':
                return 0
            total = count(index + 1)
            if index + 1 < len(s) and int(s[index:index + 2]) <= 26:
                total += count(index + 2)
            return total
        return count(0)
# @solution counts-every-digit-independently reject
class Solution:
    def numDecodings(self, s):
        return len(s)

