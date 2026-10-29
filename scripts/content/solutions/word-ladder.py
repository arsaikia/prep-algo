# @solution wildcard-pattern-bfs accept
from collections import defaultdict, deque

class Solution:
    def ladderLength(self, beginWord, endWord, wordList):
        if beginWord == endWord:
            return 1
        words = set(wordList)
        if endWord not in words:
            return 0
        words.add(beginWord)
        patterns = defaultdict(list)
        for word in words:
            for i in range(len(word)):
                patterns[word[:i] + '*' + word[i + 1:]].append(word)
        queue = deque([(beginWord, 1)])
        visited = {beginWord}
        while queue:
            word, distance = queue.popleft()
            for i in range(len(word)):
                pattern = word[:i] + '*' + word[i + 1:]
                for neighbor in patterns[pattern]:
                    if neighbor == endWord:
                        return distance + 1
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append((neighbor, distance + 1))
                patterns[pattern] = []
        return 0

# @solution bidirectional-frontier-search accept
class Solution:
    def ladderLength(self, beginWord, endWord, wordList):
        if beginWord == endWord:
            return 1
        remaining = set(wordList)
        if endWord not in remaining:
            return 0
        front, back = {beginWord}, {endWord}
        remaining.discard(beginWord)
        remaining.discard(endWord)
        distance = 1
        alphabet = 'abcdefghijklmnopqrstuvwxyz'
        while front and back:
            if len(front) > len(back):
                front, back = back, front
            next_front = set()
            distance += 1
            for word in front:
                chars = list(word)
                for i, original in enumerate(chars):
                    for char in alphabet:
                        if char == original:
                            continue
                        chars[i] = char
                        candidate = ''.join(chars)
                        if candidate in back:
                            return distance
                        if candidate in remaining:
                            remaining.remove(candidate)
                            next_front.add(candidate)
                    chars[i] = original
            front = next_front
        return 0
