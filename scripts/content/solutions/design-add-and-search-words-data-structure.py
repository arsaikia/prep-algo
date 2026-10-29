# @solution trie-recursion accept
class WordDictionary:
    def __init__(self):
        self.root = {}

    def addWord(self, word):
        node = self.root
        for char in word:
            node = node.setdefault(char, {})
        node[''] = True

    def search(self, word):
        def match(node, index):
            if index == len(word):
                return '' in node
            char = word[index]
            if char == '.':
                return any(match(child, index + 1) for key, child in node.items() if key)
            return char in node and match(node[char], index + 1)
        return match(self.root, 0)

# @solution length-indexed-word-set accept
class WordDictionary:
    def __init__(self):
        self.words_by_length = {}

    def addWord(self, word):
        self.words_by_length.setdefault(len(word), set()).add(word)

    def search(self, word):
        for candidate in self.words_by_length.get(len(word), ()):
            if all(expected == '.' or expected == actual for expected, actual in zip(word, candidate)):
                return True
        return False
# @solution treats-dot-literally reject
class WordDictionary:
    def __init__(self):
        self.words = set()
    def addWord(self, word):
        self.words.add(word)
    def search(self, word):
        return word in self.words

