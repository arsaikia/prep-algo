# @solution paired-values-and-minima accept
class MinStack:
    def __init__(self):
        self.stack = []
        self.minima = []

    def push(self, val: int) -> None:
        self.stack.append(val)
        if not self.minima or val <= self.minima[-1]:
            self.minima.append(val)

    def pop(self) -> None:
        val = self.stack.pop()
        if val == self.minima[-1]:
            self.minima.pop()

    def top(self) -> int:
        return self.stack[-1]

    def getMin(self) -> int:
        return self.minima[-1]

# @solution stack-of-value-minimum-pairs accept
class MinStack:
    def __init__(self):
        self.stack = []

    def push(self, val: int) -> None:
        current_min = min(val, self.stack[-1][1]) if self.stack else val
        self.stack.append((val, current_min))

    def pop(self) -> None:
        self.stack.pop()

    def top(self) -> int:
        return self.stack[-1][0]

    def getMin(self) -> int:
        return self.stack[-1][1]

# @solution only-tracks-last-value reject
class MinStack:
    def __init__(self):
        self.stack = []
    def push(self, val: int) -> None:
        self.stack.append(val)
    def pop(self) -> None:
        self.stack.pop()
    def top(self) -> int:
        return self.stack[-1]
    def getMin(self) -> int:
        return self.stack[-1]
