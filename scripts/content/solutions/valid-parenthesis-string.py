# @solution possible-open-count-interval accept
class Solution:
    def checkValidString(self, s):
        low = high = 0
        for char in s:
            if char == '(':
                low += 1
                high += 1
            elif char == ')':
                low = max(0, low - 1)
                high -= 1
            else:
                low = max(0, low - 1)
                high += 1
            if high < 0:
                return False
        return low == 0

# @solution forward-and-reverse-feasibility accept
class Solution:
    def checkValidString(self, s):
        balance = 0
        for char in s:
            balance += 1 if char != ')' else -1
            if balance < 0:
                return False
        balance = 0
        for char in reversed(s):
            balance += 1 if char != '(' else -1
            if balance < 0:
                return False
        return True
