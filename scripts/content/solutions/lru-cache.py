# @solution ordered-dictionary accept
from collections import OrderedDict
class LRUCache:
    def __init__(self, capacity: int) -> None:
        self.capacity=capacity; self.items=OrderedDict()
    def get(self, key: int) -> int:
        if key not in self.items: return -1
        self.items.move_to_end(key); return self.items[key]
    def put(self, key: int, value: int) -> None:
        if key in self.items: self.items.move_to_end(key)
        self.items[key]=value
        if len(self.items)>self.capacity: self.items.popitem(last=False)

# @solution doubly-linked-list accept
class LRUCache:
    class _Node:
        def __init__(self,key=0,value=0): self.key=key; self.value=value; self.prev=None; self.next=None
    def __init__(self, capacity: int) -> None:
        self.capacity=capacity; self.nodes={}; self.left=self._Node(); self.right=self._Node(); self.left.next=self.right; self.right.prev=self.left
    def _remove(self,node):
        node.prev.next=node.next; node.next.prev=node.prev
    def _append(self,node):
        node.prev=self.right.prev; node.next=self.right; self.right.prev.next=node; self.right.prev=node
    def get(self,key: int) -> int:
        if key not in self.nodes: return -1
        node=self.nodes[key]; self._remove(node); self._append(node); return node.value
    def put(self,key: int,value: int) -> None:
        if key in self.nodes:
            node=self.nodes[key]; node.value=value; self._remove(node); self._append(node)
        else:
            node=self._Node(key,value); self.nodes[key]=node; self._append(node)
            if len(self.nodes)>self.capacity:
                old=self.left.next; self._remove(old); del self.nodes[old.key]
