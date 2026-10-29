# @solution nested-dictionary-trie accept
class Trie:
    def __init__(self): self.root = {}
    def insert(self, word):
        node = self.root
        for ch in word: node = node.setdefault(ch, {})
        node['#'] = True
    def search(self, word):
        node = self._find(word)
        return node is not None and '#' in node
    def startsWith(self, prefix): return self._find(prefix) is not None
    def _find(self, text):
        node = self.root
        for ch in text:
            if ch not in node: return None
            node = node[ch]
        return node

# @solution node-based-trie accept
class _TrieNode:
    def __init__(self):
        self.children = {}
        self.terminal = False
class Trie:
    def __init__(self): self.root = _TrieNode()
    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children: node.children[ch] = _TrieNode()
            node = node.children[ch]
        node.terminal = True
    def search(self, word):
        node = self._find(word)
        return node is not None and node.terminal
    def startsWith(self, prefix): return self._find(prefix) is not None
    def _find(self, text):
        node = self.root
        for ch in text:
            if ch not in node.children: return None
            node = node.children[ch]
        return node
