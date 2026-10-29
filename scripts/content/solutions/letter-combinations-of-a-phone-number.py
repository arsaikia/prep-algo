# @solution iterative-product accept
from typing import List
class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        if not digits: return []
        mapping = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz']
        out = ['']
        for d in digits: out = [prefix + ch for prefix in out for ch in mapping[int(d)]]
        return out

# @solution recursive-backtracking accept
from typing import List
class Solution:
    def letterCombinations(self, digits: str) -> List[str]:
        if not digits: return []
        mapping = ['', '', 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz']
        out = []
        def build(i, prefix):
            if i == len(digits): out.append(prefix); return
            for ch in mapping[int(digits[i])]: build(i+1, prefix+ch)
        build(0, '')
        return out
