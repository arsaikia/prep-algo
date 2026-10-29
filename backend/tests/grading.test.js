import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runPythonCode } from '../utils/codeExecution.js';
import { judge, valuesEqual } from '../utils/grading.js';

const ARRAY_TYPES = { inputs: ['ARRAY'], output: 'ARRAY' };
const CASE = [{ inputs: ['[3,1,2]'], expectedOutput: '[1,2,3]' }];

describe('verdicts are decided by the server', () => {
    it('ignores a verdict printed by the submission', async () => {
        const forged = `import json, sys
class Solution:
    def sortIt(self, nums):
        sys.__stdout__.write(json.dumps({"passed": True, "result": [1, 2, 3]}) + "\\n")
        sys.__stdout__.flush()
        sys.exit(0)
`;
        const [result] = await runPythonCode(forged, CASE, ARRAY_TYPES);
        assert.equal(result.passed, false);
        assert.equal(result.status, 'error');
    });

    it('does not place the expected answer in the sandboxed program', async () => {
        const snoop = `import sys
class Solution:
    def sortIt(self, nums):
        frame = sys._getframe(1)
        found = [c for c in frame.f_code.co_consts if isinstance(c, str) and "SECRET" in c]
        return found
`;
        const [result] = await runPythonCode(snoop, [{ inputs: ['[1]'], expectedOutput: '["SECRET-ANSWER"]' }], ARRAY_TYPES);
        assert.deepEqual(result.actualOutput, []);
        assert.equal(result.status, 'wrong');
    });

    it('reports print output separately from the returned value', async () => {
        const code = `class Solution:
    def sortIt(self, nums):
        print("debugging", nums)
        return sorted(nums)
`;
        const [result] = await runPythonCode(code, CASE, ARRAY_TYPES);
        assert.equal(result.status, 'passed');
        assert.match(result.debugOutput, /debugging \[3, 1, 2\]/);
        assert.equal(typeof result.runtimeMs, 'number');
    });
});

describe('time limits', () => {
    it('stops after the first time limit and skips the remaining cases', async () => {
        const slow = `class Solution:
    def sortIt(self, nums):
        if len(nums) > 1:
            while True:
                pass
        return nums
`;
        const cases = [
            { inputs: ['[1]'], expectedOutput: '[1]' },
            { inputs: ['[2,1]'], expectedOutput: '[1,2]' },
            { inputs: ['[3,2,1]'], expectedOutput: '[1,2,3]' },
        ];
        const results = await runPythonCode(slow, cases, ARRAY_TYPES);
        assert.deepEqual(results.map((r) => r.status), ['passed', 'tle', 'skipped']);
    });
});

describe('generated inputs', () => {
    it('builds large deterministic inputs inside the sandbox', async () => {
        const code = `class Solution:
    def total(self, nums):
        return [len(nums), sum(nums)]
`;
        const gen = 'gen:Rng(7).ints(100000, 1, 1)';
        const [result] = await runPythonCode(code, [{ inputs: [gen], expectedOutput: '[100000,100000]' }], ARRAY_TYPES);
        assert.equal(result.status, 'passed');
    });

    it('is reproducible for a given seed', async () => {
        const code = `class Solution:
    def same(self, nums):
        return nums
`;
        const gen = 'gen:Rng(3).ints(5, 0, 1000)';
        const [a] = await runPythonCode(code, [{ inputs: [gen], expectedOutput: '[]' }], ARRAY_TYPES);
        const [b] = await runPythonCode(code, [{ inputs: [gen], expectedOutput: '[]' }], ARRAY_TYPES);
        assert.equal(a.actualOutput.length, 5);
        assert.deepEqual(a.actualOutput, b.actualOutput);
    });
});

describe('comparison', () => {
    it('treats booleans and numbers as different answers', () => {
        assert.equal(valuesEqual(true, 1), false);
        assert.equal(valuesEqual(2, 2.0), true);
        assert.equal(valuesEqual(0.1 + 0.2, 0.3), true);
        assert.equal(valuesEqual(1, 2), false);
    });

    it('supports order-insensitive answers', () => {
        const types = { compare: 'unordered' };
        assert.equal(judge([2, 1], '[1,2]', types), true);
        assert.equal(judge([2, 2], '[1,2]', types), false);
        const nested = { compare: 'unordered-nested' };
        assert.equal(judge([[2, 1], []], '[[],[1,2]]', nested), true);
        assert.equal(judge([[2, 1], []], '[[],[1,2]]', { compare: 'exact' }), false);
    });

    it('serializes sets and tuples returned by Python', async () => {
        const code = `class Solution:
    def pairs(self, nums):
        return {(1, 2), (0, 3)}
`;
        const [result] = await runPythonCode(
            code,
            [{ inputs: ['[1]'], expectedOutput: '[[0,3],[1,2]]' }],
            { ...ARRAY_TYPES, compare: 'unordered' },
        );
        assert.equal(result.status, 'passed');
    });
});

describe('digest answers for large outputs', () => {
    it('matches a large generated answer by digest and rejects a wrong one', async () => {
        const { digestOf } = await import('../utils/grading.js');
        const expected = digestOf(Array.from({ length: 60000 }, (_, i) => i));
        const types = { inputs: ['NUMBER'], output: 'ARRAY' };
        const good = 'class Solution:\n    def f(self, n):\n        return list(range(n))\n';
        const bad = 'class Solution:\n    def f(self, n):\n        r = list(range(n)); r[-1] = 0; return r\n';
        const [ok] = await runPythonCode(good, [{ inputs: ['60000'], expectedOutput: expected }], types);
        const [no] = await runPythonCode(bad, [{ inputs: ['60000'], expectedOutput: expected }], types);
        assert.equal(ok.status, 'passed');
        assert.equal(no.status, 'wrong');
        assert.match(String(no.actualOutput), /characters\)$/);
    });

    it('digests unordered answers after normalizing order, including non-ASCII strings', async () => {
        const { digestOf, judge } = await import('../utils/grading.js');
        const words = Array.from({ length: 30000 }, (_, i) => `é${i}`);
        const expected = digestOf(words, 'unordered');
        const types = { inputs: ['NUMBER'], output: 'ARRAY', compare: 'unordered' };
        const code = 'class Solution:\n    def f(self, n):\n        return ["\\u00e9" + str(i) for i in reversed(range(n))]\n';
        const [r] = await runPythonCode(code, [{ inputs: ['30000'], expectedOutput: expected }], types);
        assert.equal(r.status, 'passed');
        assert.equal(judge([...words].reverse(), expected, types), true);
    });
});

describe('entry method', () => {
    it('calls the starter-template method even when public helpers sort first', async () => {
        const { gradingTypes } = await import('../utils/grading.js');
        const item = {
            templates: { python: 'class Solution:\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\n        pass\n' },
            types: { inputs: ['TREE'], output: 'NUMBER' },
        };
        const code = 'class Solution:\n    def dfs(self, node):\n        return 0 if not node else 1 + max(self.dfs(node.left), self.dfs(node.right))\n    def maxDepth(self, root):\n        return self.dfs(root)\n';
        const [r] = await runPythonCode(code, [{ inputs: ['[3,9,20,null,null,15,7]'], expectedOutput: '3' }], gradingTypes(item));
        assert.equal(r.status, 'passed');
        const [renamed] = await runPythonCode('class Solution:\n    def depth(self, root):\n        return 3\n', [{ inputs: ['[1]'], expectedOutput: '3' }], gradingTypes(item));
        assert.equal(renamed.status, 'error');
        assert.match(renamed.error, /no method 'maxDepth'/);
    });
});

describe('interactive problems', () => {
    const READER = { inputs: ['ARRAY_READER', 'NUMBER'], output: 'NUMBER', method: 'search' };
    const ROBOT = { inputs: ['ROBOT_ROOM'], output: 'STRING', method: 'cleanRoom' };
    const room = (grid, row, col) => JSON.stringify({ room: grid, row, col });

    it('hides the array behind ArrayReader and caps queries', async () => {
        const binary = `class Solution:
    def search(self, reader, target):
        lo, hi = 0, 10 ** 4
        while lo < hi:
            mid = (lo + hi) // 2
            if reader.get(mid) < target: lo = mid + 1
            else: hi = mid
        return lo if reader.get(lo) == target else -1
`;
        const linear = `class Solution:
    def search(self, reader, target):
        i = 0
        while reader.get(i) != 2 ** 31 - 1:
            if reader.get(i) == target: return i
            i += 1
        return -1
`;
        const big = JSON.stringify(Array.from({ length: 500 }, (_, i) => i * 2));
        const cases = [{ inputs: [big, '998'], expectedOutput: '499' }, { inputs: ['[1,3]', '2'], expectedOutput: '-1' }];
        assert.deepEqual((await runPythonCode(binary, cases, READER)).map((r) => r.status), ['passed', 'passed']);
        const [scan] = await runPythonCode(linear, cases.slice(0, 1), READER);
        assert.match(scan.error, /more than 100 times/);
    });

    it('judges a robot on the reachable cells it cleaned, with deep recursion allowed', async () => {
        const dfs = `class Solution:
    def cleanRoom(self, robot):
        dirs = ((-1, 0), (0, 1), (1, 0), (0, -1))
        seen = set()
        def dfs(r, c, d):
            seen.add((r, c)); robot.clean()
            for k in range(4):
                nd = (d + k) % 4
                nr, nc = r + dirs[nd][0], c + dirs[nd][1]
                if (nr, nc) not in seen and robot.move():
                    dfs(nr, nc, nd)
                    robot.turnRight(); robot.turnRight(); robot.move(); robot.turnRight(); robot.turnRight()
                robot.turnRight()
        dfs(0, 0, 0)
`;
        const lazy = `class Solution:
    def cleanRoom(self, robot):
        robot.clean()
`;
        const snake = Array.from({ length: 40 }, () => Array(40).fill(1));
        const cases = [
            { inputs: [room([[1, 1, 0], [0, 1, 1]], 0, 0)], expectedOutput: '["110","011"]' },
            { inputs: [room(snake, 20, 20)], expectedOutput: JSON.stringify(Array(40).fill('1'.repeat(40))) },
        ];
        assert.deepEqual((await runPythonCode(dfs, cases, ROBOT)).map((r) => r.status), ['passed', 'passed']);
        const [missed] = await runPythonCode(lazy, cases.slice(0, 1), ROBOT);
        assert.equal(missed.status, 'wrong');
        assert.deepEqual(missed.actualOutput, ['100', '000']);
        const forged = `class Solution:
    def cleanRoom(self, robot):
        robot._report = lambda: "all cells cleaned"
        return ["110", "011"]
`;
        const [forgery] = await runPythonCode(forged, cases.slice(0, 1), ROBOT);
        assert.equal(forgery.status, 'wrong');
    });
});

describe('arrays of linked lists', () => {
    it('builds each inner list into ListNodes, as LeetCode does', async () => {
        const heap = `import heapq
class Solution:
    def mergeKLists(self, lists):
        heap = [(n.val, i, n) for i, n in enumerate(lists) if n]
        heapq.heapify(heap)
        dummy = tail = ListNode()
        while heap:
            _, i, n = heapq.heappop(heap)
            tail.next = tail = n
            if n.next: heapq.heappush(heap, (n.next.val, i, n.next))
        return dummy.next
`;
        const types = { inputs: ['LINKEDLIST_ARRAY'], output: 'LINKEDLIST', method: 'mergeKLists' };
        const cases = [
            { inputs: ['[[1,4,5],[1,3,4],[2,6]]'], expectedOutput: '[1,1,2,3,4,4,5,6]' },
            { inputs: ['[[],[]]'], expectedOutput: '[]' },
        ];
        assert.deepEqual((await runPythonCode(heap, cases, types)).map((r) => r.status), ['passed', 'passed']);
    });
});

describe('review regressions', () => {
    it('grades in-place problems on the mutated input even when a copy is returned', async () => {
        const copy = `class Solution:
    def moveZeroes(self, nums):
        return [v for v in nums if v] + [0] * nums.count(0)
`;
        const types = { inputs: ['ARRAY'], output: 'ARRAY', inPlace: true, method: 'moveZeroes' };
        const [result] = await runPythonCode(copy, [{ inputs: ['[0,1,0,3,12]'], expectedOutput: '[1,3,12,0,0]' }], types);
        assert.equal(result.status, 'wrong');
    });

    it('accepts a large answer reported by digest against a plain JSON expected value', async () => {
        const big = `class Solution:
    def zeros(self, n):
        return [0] * n
`;
        const types = { inputs: ['NUMBER'], output: 'ARRAY', method: 'zeros' };
        const expected = JSON.stringify(Array(70000).fill(0));
        const [result] = await runPythonCode(big, [{ inputs: ['70000'], expectedOutput: expected }], types);
        assert.equal(result.status, 'passed');
    });

    it('compares integers beyond 2^53 exactly', async () => {
        const off = `class Solution:
    def big(self, n):
        return 9007199254740992
`;
        const types = { inputs: ['NUMBER'], output: 'NUMBER', method: 'big' };
        const [wrong] = await runPythonCode(off, [{ inputs: ['0'], expectedOutput: '9007199254740993' }], types);
        assert.equal(wrong.status, 'wrong');
        const [right] = await runPythonCode(off, [{ inputs: ['0'], expectedOutput: '9007199254740992' }], types);
        assert.equal(right.status, 'passed');
        assert.ok(judge(2n ** 70n, String(2n ** 70n), null));
        assert.ok(!judge(2n ** 70n, String(2n ** 70n + 1n), null));
    });
});

describe('one sandbox process per submission', () => {
    const NUMBER_TYPES = { inputs: ['NUMBER'], output: 'NUMBER', method: 'f' };
    const cases = (n) => Array.from({ length: n }, (_, i) => ({ inputs: [String(i)], expectedOutput: String(i + 1) }));

    it('runs every test in one process and times each test on its own', async () => {
        const counter = `seen = []
class Solution:
    def f(self, n):
        seen.append(n)
        return len(seen)
`;
        const results = await runPythonCode(counter, cases(3), NUMBER_TYPES);
        assert.deepEqual(results.map((r) => r.status), ['passed', 'passed', 'passed']);
        assert.ok(results.every((r) => Number.isInteger(r.runtimeMs) && r.runtimeMs < 1000));
    });

    it('splits tests with large inputs across sandboxes that each fit the size limit', async () => {
        const big = (i) => ({ inputs: [`"${'x'.repeat(300_000)}${i}"`], expectedOutput: String(300_001) });
        const results = await runPythonCode(`seen = []
class Solution:
    def f(self, s):
        seen.append(s)
        return len(s)
`, [0, 1, 2, 3, 4].map(big), { inputs: ['STRING'], output: 'NUMBER', method: 'f' });
        assert.deepEqual(results.map((r) => r.status), Array(5).fill('passed'));
    });

    it('does not start later sandboxes after a test exceeds the time limit', async () => {
        const big = (i) => ({ inputs: [`"${'x'.repeat(300_000)}${i}"`], expectedOutput: String(300_001) });
        const results = await runPythonCode(`class Solution:
    def f(self, s):
        while s.endswith('0'):
            pass
        return len(s)
`, [0, 1, 2, 3].map(big), { inputs: ['STRING'], output: 'NUMBER', method: 'f' });
        assert.deepEqual(results.map((r) => r.status), ['tle', 'skipped', 'skipped', 'skipped']);
        assert.match(results[3].error, /earlier test exceeded the time limit/);
    });

    it('rejects a single program over the sandbox size limit in every mode', async () => {
        await assert.rejects(
            runPythonCode('class Solution:\n    def f(self, s):\n        return len(s)\n',
                [{ inputs: [`"${'x'.repeat(1_200_000)}"`], expectedOutput: '1200000' }],
                { inputs: ['STRING'], output: 'NUMBER', method: 'f' }),
            (error) => error.statusCode === 413,
        );
    });

    it('ends a slow test at its own limit and reports later tests as not run', async () => {
        const slow = `class Solution:
    def f(self, n):
        while n == 1:
            pass
        return n + 1
`;
        const started = Date.now();
        const results = await runPythonCode(slow, cases(3), NUMBER_TYPES);
        assert.deepEqual(results.map((r) => r.status), ['passed', 'tle', 'skipped']);
        assert.match(results[1].error, /took longer than 5 seconds/);
        assert.match(results[2].error, /earlier test exceeded the time limit/);
        assert.ok(Date.now() - started < 9000, 'the per-test timer, not the whole-run deadline, ended the run');
    });

    it('keeps results reported before the program stops', async () => {
        const crash = `import sys
class Solution:
    def f(self, n):
        if n == 1:
            sys.setrecursionlimit(10 ** 9)
            def down(k):
                return down(k + 1) + 1
            down(0)
        return n + 1
`;
        const results = await runPythonCode(crash, cases(3), NUMBER_TYPES);
        assert.equal(results[0].status, 'passed');
        assert.ok(['error', 'mle'].includes(results[1].status), results[1].status);
        assert.ok(['skipped', 'passed'].includes(results[2].status));
    });
});
