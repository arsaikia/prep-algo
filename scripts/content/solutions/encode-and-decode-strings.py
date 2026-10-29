# @solution length-prefix accept
class Codec:
    def encode(self, strs: List[str]) -> str:
        return ''.join(f'{len(s)}#{s}' for s in strs)

    def decode(self, s: str) -> List[str]:
        out, i = [], 0
        while i < len(s):
            j = s.index('#', i)
            n = int(s[i:j])
            out.append(s[j + 1:j + 1 + n])
            i = j + 1 + n
        return out

# @solution escape-and-separate accept
class Codec:
    def encode(self, strs: List[str]) -> str:
        return ''.join(s.replace('/', '//') + '/:' for s in strs)

    def decode(self, s: str) -> List[str]:
        out, cur, i = [], [], 0
        while i < len(s):
            if s[i] == '/' and s[i + 1] == '/':
                cur.append('/')
                i += 2
            elif s[i] == '/' and s[i + 1] == ':':
                out.append(''.join(cur))
                cur = []
                i += 2
            else:
                cur.append(s[i])
                i += 1
        return out

# @solution returns-list-not-string reject
class Codec:
    def encode(self, strs):
        return strs

    def decode(self, s):
        return s

# @solution naive-delimiter reject
class Codec:
    def encode(self, strs):
        return ','.join(strs)

    def decode(self, s):
        return s.split(',') if s else []
