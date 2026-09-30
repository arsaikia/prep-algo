import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { runPythonCode } from '../utils/codeExecution.js';

/**
 * Four problems are about the *shape* of a structure rather than the values
 * in it, and a flat array cannot carry that shape. A cycle, a random pointer
 * and a graph edge all vanish when a linked list is serialized the usual way,
 * so these problems were ungradable until the harness learned to build and
 * serialize the structures directly.
 *
 * The cheat tests are the important ones. `clone-graph` and
 * `copy-list-with-random-pointer` exist to teach deep copying, so a harness
 * that accepts `return node` teaches the opposite of the lesson. Returning the
 * input has to fail, and it has to fail with a message that names the mistake.
 */

const GRAPH_TYPES = { inputs: ['GRAPH'], output: 'GRAPH' };
const RANDOM_LIST_TYPES = { inputs: ['RANDOM_LIST'], output: 'RANDOM_LIST' };
const CYCLE_BOOL_TYPES = { inputs: ['LINKEDLIST_CYCLE'], output: 'BOOLEAN' };
const CYCLE_INDEX_TYPES = { inputs: ['LINKEDLIST_CYCLE'], output: 'NODE_INDEX' };

const CLONE_GRAPH = `class Solution:
    def cloneGraph(self, node):
        if not node:
            return None
        seen = {}
        def dfs(n):
            if n in seen:
                return seen[n]
            copy = Node(n.val)
            seen[n] = copy
            for nb in n.neighbors:
                copy.neighbors.append(dfs(nb))
            return copy
        return dfs(node)
`;

const COPY_RANDOM_LIST = `class Solution:
    def copyRandomList(self, head):
        if not head:
            return None
        seen = {}
        cur = head
        while cur:
            seen[cur] = Node(cur.val)
            cur = cur.next
        cur = head
        while cur:
            seen[cur].next = seen.get(cur.next)
            seen[cur].random = seen.get(cur.random)
            cur = cur.next
        return seen[head]
`;

const HAS_CYCLE = `class Solution:
    def hasCycle(self, head):
        slow = fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                return True
        return False
`;

const DETECT_CYCLE = `class Solution:
    def detectCycle(self, head):
        slow = fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                slow = head
                while slow is not fast:
                    slow = slow.next
                    fast = fast.next
                return slow
        return None
`;

describe('structural input types', () => {
    it('rebuilds a cycle so the tail links back to the recorded index', async () => {
        const results = await runPythonCode(
            HAS_CYCLE,
            [
                { inputs: ['{"values":[3,2,0,-4],"pos":1}'], expectedOutput: 'true' },
                { inputs: ['{"values":[1,2],"pos":-1}'], expectedOutput: 'false' },
                { inputs: ['{"values":[],"pos":-1}'], expectedOutput: 'false' },
            ],
            CYCLE_BOOL_TYPES,
        );

        assert.deepEqual(results.map((r) => r.passed), [true, true, true]);
    });

    it('reports which input node was returned rather than its value', async () => {
        // Two nodes can share a value, so the answer to "where does the cycle
        // start" is a position, not a number the learner could guess.
        const results = await runPythonCode(
            DETECT_CYCLE,
            [
                { inputs: ['{"values":[3,2,0,-4],"pos":1}'], expectedOutput: '1' },
                { inputs: ['{"values":[1,2],"pos":-1}'], expectedOutput: '-1' },
            ],
            CYCLE_INDEX_TYPES,
        );

        assert.deepEqual(results.map((r) => r.passed), [true, true]);
    });

    it('round-trips a graph through an adjacency list', async () => {
        const results = await runPythonCode(
            CLONE_GRAPH,
            [
                { inputs: ['[[2,4],[1,3],[2,4],[1,3]]'], expectedOutput: '[[2,4],[1,3],[2,4],[1,3]]' },
                { inputs: ['[[]]'], expectedOutput: '[[]]' },
                { inputs: ['[]'], expectedOutput: '[]' },
            ],
            GRAPH_TYPES,
        );

        assert.deepEqual(results.map((r) => r.passed), [true, true, true]);
    });

    it('round-trips a random pointer list', async () => {
        const results = await runPythonCode(
            COPY_RANDOM_LIST,
            [
                {
                    inputs: ['[[7,null],[13,0],[11,4],[10,2],[1,0]]'],
                    expectedOutput: '[[7,null],[13,0],[11,4],[10,2],[1,0]]',
                },
                { inputs: ['[]'], expectedOutput: '[]' },
            ],
            RANDOM_LIST_TYPES,
        );

        assert.deepEqual(results.map((r) => r.passed), [true, true]);
    });

    it('fails a graph answer that hands back the input nodes', async () => {
        const [result] = await runPythonCode(
            'class Solution:\n    def cloneGraph(self, node):\n        return node\n',
            [{ inputs: ['[[2,4],[1,3],[2,4],[1,3]]'], expectedOutput: '[[2,4],[1,3],[2,4],[1,3]]' }],
            GRAPH_TYPES,
        );

        assert.equal(result.passed, false);
        assert.match(result.error, /original nodes instead of a copy/);
    });

    it('fails a random list answer that hands back the input nodes', async () => {
        const [result] = await runPythonCode(
            'class Solution:\n    def copyRandomList(self, head):\n        return head\n',
            [{ inputs: ['[[7,null],[13,0]]'], expectedOutput: '[[7,null],[13,0]]' }],
            RANDOM_LIST_TYPES,
        );

        assert.equal(result.passed, false);
        assert.match(result.error, /original nodes instead of a copy/);
    });

    it('fails a copy that loses the random pointers', async () => {
        // A learner who copies `next` but forgets `random` has done the easy
        // half. The serializer has to notice, or the problem grades as solved.
        const [result] = await runPythonCode(
            `class Solution:
    def copyRandomList(self, head):
        if not head:
            return None
        dummy = Node(0)
        tail = dummy
        cur = head
        while cur:
            tail.next = Node(cur.val)
            tail = tail.next
            cur = cur.next
        return dummy.next
`,
            [{ inputs: ['[[7,null],[13,0],[11,4],[10,2],[1,0]]'], expectedOutput: '[[7,null],[13,0],[11,4],[10,2],[1,0]]' }],
            RANDOM_LIST_TYPES,
        );

        assert.equal(result.passed, false);
    });

    it('rejects a test case whose cycle index is out of range', async () => {
        const [result] = await runPythonCode(
            HAS_CYCLE,
            [{ inputs: ['{"values":[1,2],"pos":9}'], expectedOutput: 'true' }],
            CYCLE_BOOL_TYPES,
        );

        assert.equal(result.passed, false);
        assert.match(result.error, /index 9 of a 2 node list/);
    });
});
