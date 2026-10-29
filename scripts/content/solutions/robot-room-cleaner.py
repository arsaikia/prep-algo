# @solution backtracking-dfs accept
class Solution:
    def cleanRoom(self, robot) -> None:
        dirs = ((-1, 0), (0, 1), (1, 0), (0, -1))
        seen = set()

        def back():
            robot.turnRight(); robot.turnRight()
            robot.move()
            robot.turnRight(); robot.turnRight()

        def dfs(r, c, d):
            seen.add((r, c))
            robot.clean()
            for k in range(4):
                nd = (d + k) % 4
                nr, nc = r + dirs[nd][0], c + dirs[nd][1]
                if (nr, nc) not in seen and robot.move():
                    dfs(nr, nc, nd)
                    back()
                robot.turnRight()

        dfs(0, 0, 0)

# @solution iterative-stack accept
class Solution:
    def cleanRoom(self, robot) -> None:
        dirs = ((-1, 0), (0, 1), (1, 0), (0, -1))
        facing = 0

        def face(target):
            nonlocal facing
            while facing != target:
                robot.turnRight()
                facing = (facing + 1) % 4

        seen = {(0, 0)}
        robot.clean()
        stack = [((0, 0), None, 0)]  # cell, direction we arrived from, next dir to try
        while stack:
            (r, c), came, k = stack.pop()
            moved = False
            while k < 4:
                nr, nc = r + dirs[k][0], c + dirs[k][1]
                if (nr, nc) not in seen:
                    face(k)
                    if robot.move():
                        seen.add((nr, nc))
                        robot.clean()
                        stack.append(((r, c), came, k + 1))
                        stack.append(((nr, nc), k, 0))
                        moved = True
                        break
                    seen.add((nr, nc))
                k += 1
            if not moved and came is not None:
                face((came + 2) % 4)
                robot.move()

# @solution only-start-cell reject
class Solution:
    def cleanRoom(self, robot) -> None:
        robot.clean()

# @solution straight-lines-only reject
class Solution:
    def cleanRoom(self, robot) -> None:
        robot.clean()
        for _ in range(4):
            steps = 0
            while robot.move():
                robot.clean()
                steps += 1
            robot.turnRight(); robot.turnRight()
            for _ in range(steps):
                robot.move()
            robot.turnLeft()
