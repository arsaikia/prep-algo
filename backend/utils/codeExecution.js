import { randomBytes } from 'node:crypto';
import { executeProgram, POLICY } from './sandbox/index.js';
import { parseJson, judge } from './grading.js';
import { buildJavaScriptProgram } from './javascriptHarness.js';
import { getExecutionBudget, runSubmission } from './executionBudget.js';

// Constants
const EXECUTION_TIMEOUT = POLICY.timeoutMs;

/**
 * Extract imports from Python code
 * @param {string} code - The Python code to extract imports from
 * @returns {string} - The extracted imports
 */
const extractImports = (code) => {
    const importRegex = /^(?:from\s+[\w.]+\s+import\s+[\w\s,]+|import\s+[\w\s,]+)$/gm;
    const imports = code.match(importRegex) || [];
    return imports.join('\n');
};

/**
 * Remove imports from Python code
 * @param {string} code - The Python code to remove imports from
 * @returns {string} - The code without imports
 */
const removeImports = (code) => {
    const importRegex = /^(?:from\s+[\w.]+\s+import\s+[\w\s,]+|import\s+[\w\s,]+)$/gm;
    return code.replace(importRegex, '').trim();
};

/**
 * Add necessary typing imports if they're used but not imported
 * @param {string} code - The Python code to analyze
 * @returns {string} - Additional imports needed
 */
const getRequiredTypingImports = (code) => {
    const existingImports = extractImports(code);
    const codeWithoutImports = removeImports(code);

    // Common typing imports that might be needed
    const typingTypes = ['List', 'Dict', 'Set', 'Tuple', 'Optional', 'Union', 'Any'];
    const neededTypes = [];

    // Check if typing types are used but not imported
    for (const type of typingTypes) {
        if (codeWithoutImports.includes(type) && !existingImports.includes(type)) {
            neededTypes.push(type);
        }
    }

    if (neededTypes.length > 0) {
        return `from typing import ${neededTypes.join(', ')}`;
    }

    return '';
};

/**
 * Detect input type based on content and context
 * @param {string} input - The input string
 * @param {string} code - The user's code (for context)
 * @returns {string} - The detected type ('ARRAY', 'TREE', 'STRING', 'NUMBER', 'BOOLEAN', 'LINKEDLIST')
 */
/**
 * Convert question types to internal type format
 * @param {Array<string>} questionInputTypes - Array of input types from question
 * @param {string} questionOutputType - Output type from question
 * @returns {Object} - Object with inputTypes and outputType
 */
const convertQuestionTypes = (questionInputTypes, questionOutputType) => {
    return {
        inputTypes: questionInputTypes || [],
        outputType: questionOutputType || 'STRING'
    };
};

const detectInputType = (input, code) => {
    try {
        // Check if it's a JSON array
        if (input.startsWith('[') && input.endsWith(']')) {
            const parsed = JSON.parse(input);

            if (Array.isArray(parsed)) {
                // Check for tree data (contains null values or "null" strings)
                if (parsed.includes(null) || input.includes('null')) {
                    return 'TREE';
                }

                // Check if this is likely a tree problem based on code context
                if (code.includes('TreeNode') || code.includes('root') ||
                    code.includes('left') || code.includes('right')) {
                    return 'TREE';
                }

                // Check for linked list data (all numbers, no nulls)
                if (parsed.every(item => typeof item === 'number') &&
                    (code.includes('ListNode') || code.includes('next'))) {
                    return 'LINKEDLIST';
                }

                // Default to array
                return 'ARRAY';
            }
        }

        // Check for string (if it's not a JSON array and contains letters)
        if (input.startsWith('"') && input.endsWith('"')) {
            return 'STRING';
        }

        // Check for boolean
        if (input.toLowerCase() === 'true' || input.toLowerCase() === 'false') {
            return 'BOOLEAN';
        }

        // Check for number
        if (!isNaN(input) && input.trim() !== '') {
            return 'NUMBER';
        }

        // Default to string
        return 'STRING';
    } catch (e) {
        // If JSON parsing fails, treat as string
        return 'STRING';
    }
};

/**
 * Generate Python code to parse input based on detected type
 * @param {string} input - The input string
 * @param {string} type - The detected type
 * @returns {string} - Python code to parse the input
 */
/**
 * Python expression for an input's raw value. Authored inputs are JSON; large
 * hidden inputs may instead be `gen:<python expression>`, built in the sandbox
 * from a seeded generator so a 10^5-element case costs a few bytes of source.
 */
const rawValue = (input) => (input.startsWith('gen:')
    ? `_generate(${JSON.stringify(input.slice(4).trim())})`
    : `json.loads(${JSON.stringify(input)})`);

const generateInputParser = (input, type) => {
    switch (type) {
        case 'ARRAY':
        case 'STRING':
        case 'BOOLEAN':
        case 'NUMBER':
            return rawValue(input);
        case 'TREE':
            return `buildTree(${rawValue(input)})`;
        case 'LINKEDLIST':
            return `buildLinkedList(${rawValue(input)})`;
        case 'LINKEDLIST_CYCLE':
            return `buildCycleList(${rawValue(input)})`;
        case 'GRAPH':
            return `buildGraph(${rawValue(input)})`;
        case 'RANDOM_LIST':
            return `buildRandomList(${rawValue(input)})`;
        case 'LINKEDLIST_ARRAY':
            return `[buildLinkedList(_values) for _values in ${rawValue(input)}]`;
        case 'ARRAY_READER':
            return `ArrayReader(${rawValue(input)})`;
        case 'ROBOT_ROOM':
            return `_robot_from(${rawValue(input)})`;
        default:
            return input.startsWith('gen:') ? rawValue(input) : `eval(${JSON.stringify(input)})`;
    }
};

/**
 * Grade a submission against test cases: Python by default, JavaScript when
 * `questionTypes.language` is `javascript`.
 * @param {string} code - The submitted source
 * @param {Array<{inputs: Array<string>, expectedOutput: string}>} testCases - Array of test cases
 * @param {Object} questionTypes - Optional question types object with inputs and output arrays
 * @returns {Promise<Array<{input: string[], expectedOutput: string, actualOutput: unknown, passed: boolean,
 *   status: string, error: string|null, debugOutput: string, runtimeMs: number|null}>>}
 */
export const runCode = (code, testCases, questionTypes = null, options = {}) =>
    runSubmission(() => runTestCases(code, testCases, questionTypes), options);

/** Python is the default; `questionTypes.language` selects JavaScript. */
export const runPythonCode = runCode;

// Room left for the round trip and verdict once a case's own limit expires.
const DEADLINE_RESERVE_MS = 1500;
const MIN_CASE_TIMEOUT_MS = 1000;
// Larger results are reported as a digest so they fit the sandbox output cap.
const INLINE_RESULT_LIMIT = 200_000;

/**
 * One graded case. `status` is passed | wrong | error | tle | mle | skipped;
 * `passed` is kept for existing consumers.
 */
const outcome = (testCase, { status, actualOutput = null, error = null, debugOutput = '', runtimeMs = null, digest }) => ({
    input: testCase.inputs,
    expectedOutput: testCase.expectedOutput,
    actualOutput,
    passed: status === 'passed',
    status,
    error,
    debugOutput: debugOutput || '',
    runtimeMs,
    ...(digest ? { digest } : {}),
});

/**
 * Runs one prepared program and grades its marked result line on the server.
 * Shared by every grading language so limits and verdicts stay identical.
 */
const executeCase = async ({ testCase, source, marker, questionTypes, language }) => {
    const budget = getExecutionBudget();
    const remainingMs = budget?.deadline ? budget.deadline - Date.now() - DEADLINE_RESERVE_MS : EXECUTION_TIMEOUT;
    const timeoutMs = Math.min(EXECUTION_TIMEOUT, Math.floor(remainingMs));
    if (timeoutMs < MIN_CASE_TIMEOUT_MS) {
        return {
            stopReason: 'Not run: the submission used up its total time budget',
            result: outcome(testCase, { status: 'tle', error: 'Time Limit Exceeded: the submission used up its total time budget' }),
        };
    }

    const started = Date.now();
    const execution = await executeProgram({ source, timeoutMs, language });
    const runtimeMs = Date.now() - started;
    getExecutionBudget()?.signal.throwIfAborted();

    if (execution.timedOut) {
        return {
            stopReason: 'Not run: an earlier test exceeded the time limit',
            result: outcome(testCase, {
                status: 'tle',
                runtimeMs,
                error: `Time Limit Exceeded: took longer than ${(timeoutMs / 1000).toFixed(timeoutMs % 1000 ? 1 : 0)} seconds`,
            }),
        };
    }
    if (execution.oom) {
        return { result: outcome(testCase, { status: 'mle', runtimeMs, error: `Memory Limit Exceeded: used more than ${POLICY.memoryMb}MB` }) };
    }

    // The harness prints one marked line carrying the returned value;
    // anything else on stdout is the submission's own output.
    const line = execution.stdout.split('\n').reverse().find((l) => l.startsWith(marker));
    if (!line) {
        const detail = execution.stderr.trim() || (execution.exitCode === 0
            ? 'Program exited before returning a result'
            : 'Execution failed');
        return { result: outcome(testCase, { status: 'error', runtimeMs, error: detail }) };
    }
    const payload = JSON.parse(line.slice(marker.length));
    if (payload.error) {
        return { result: outcome(testCase, { status: 'error', runtimeMs, error: payload.error, debugOutput: payload.debugOutput }) };
    }

    // Judge the exact value; the display copy may round integers beyond 2^53.
    const exact = payload.digest ? null : parseJson(line.slice(marker.length)).result;
    const passed = judge(exact, testCase.expectedOutput, questionTypes, testCase.inputs, payload.digest ?? null);
    return { result: outcome(testCase, {
        status: passed ? 'passed' : 'wrong',
        runtimeMs,
        actualOutput: payload.digest ? `${payload.preview}… (${payload.size} characters)` : payload.result,
        digest: payload.digest,
        debugOutput: payload.debugOutput,
    }) };
};

const runTestCases = async (code, testCases, questionTypes) => {
    const results = [];

    let stopReason = null;

    for (const testCase of testCases) {
        getExecutionBudget()?.signal.throwIfAborted();
        if (stopReason) {
            results.push(outcome(testCase, { status: 'skipped', error: stopReason }));
            continue;
        }
        try {
            if (questionTypes?.language === 'javascript') {
                const marker = `__PREPALGO_RESULT_${randomBytes(8).toString('hex')}__`;
                const source = buildJavaScriptProgram({ code, scenario: testCase.inputs[0], entry: questionTypes.method, marker });
                const graded = await executeCase({ testCase, source, marker, questionTypes, language: 'javascript' });
                if (graded.stopReason) stopReason = graded.stopReason;
                results.push(graded.result);
                continue;
            }

            // Determine input and output types
            let inputTypes, expectedOutputType;

            if (questionTypes && questionTypes.inputs && questionTypes.output) {
                // Use question types if available
                const convertedTypes = convertQuestionTypes(questionTypes.inputs, questionTypes.output);
                inputTypes = convertedTypes.inputTypes;
                expectedOutputType = convertedTypes.outputType;

                // Ensure we have enough input types for all inputs
                while (inputTypes.length < testCase.inputs.length) {
                    inputTypes.push('STRING'); // fallback to string
                }
            } else {
                // Fall back to type inference
                inputTypes = testCase.inputs.map(input => detectInputType(input, code));
                expectedOutputType = detectInputType(testCase.expectedOutput, code);
            }

            // A design problem is graded by replaying a sequence of calls against
            // one long-lived object rather than by calling a pure function once.
            // The whole sequence is data, so a new design problem is content only.
            const opsMode = inputTypes[0] === 'OPS';
            // Encoder/decoder problems are graded on decode(encode(input)).
            const codecMethods = !opsMode && Array.isArray(questionTypes?.codec) ? questionTypes.codec : null;

            // Learners write `Node` for both clone-graph and copy-list, but the
            // two carry different fields. Only one shape is ever in play for a
            // given problem, so bind the name to the one this problem declared.
            const nodeAlias = inputTypes.includes('GRAPH')
                ? 'Node = GraphNode'
                : inputTypes.includes('TREE_CONTEXT')
                    ? 'Node = TreeNode'
                : inputTypes.includes('RANDOM_LIST')
                    ? 'Node = RandomListNode'
                    : '';

            if (opsMode) {
                // Ops problems are always judged on the list of per-call return
                // values, whatever the content happens to declare as the output.
                expectedOutputType = 'ARRAY';
            }

            // Generate input parsing code
            // TREE_NODE inputs are nodes of the most recent tree (LeetCode's
            // `p`, `q`); a TREE_CONTEXT tree is built for them but not passed.
            const argLines = testCase.inputs.map((input, index) => {
                const type = inputTypes[index];
                if (type === 'TREE_NODE') return `        args.append(_find_node(_tree, ${rawValue(input)}))`;
                if (type === 'TREE_CONTEXT') return `        _tree = ${generateInputParser(input, 'TREE')}`;
                if (type === 'ROBOT_ROOM') {
                    return `        args.append(${generateInputParser(input, type)})
        _robot_cells = args[-1]._Robot__cleaned
        _robot_shape = [len(_row) for _row in ${rawValue(input)}["room"]]`;
                }
                const line = `        args.append(${generateInputParser(input, type)})`;
                return type === 'TREE' ? `${line}\n        _tree = args[-1]` : line;
            }).join('\n');

            const driverBlock = opsMode
                ? `        # Replay a recorded call sequence against one instance.
        calls = ${rawValue(testCase.inputs[0] ?? '[]')}
        call_args = ${rawValue(testCase.inputs[1] ?? '[]')}

        if not calls:
            raise Exception("Ops test case has no calls")
        if len(calls) != len(call_args):
            raise Exception("Ops test case lists %d calls but %d argument groups" % (len(calls), len(call_args)))

        class_name = calls[0]
        target_class = globals().get(class_name)
        if target_class is None:
            raise Exception("Class '%s' is not defined. Name your class exactly '%s'." % (class_name, class_name))

        instance = target_class(*call_args[0])
        result = [None]

        for call_index in range(1, len(calls)):
            method_name = calls[call_index]
            method = getattr(instance, method_name, None)
            if method is None or not callable(method):
                raise Exception("'%s' has no method '%s'" % (class_name, method_name))
            result.append(method(*call_args[call_index]))`
                : codecMethods
                    ? `        # Round-trip through two separate Codec instances, as LeetCode does.
        args = []
        _tree = None
${argLines}
        if 'Codec' not in globals():
            raise Exception("Class 'Codec' is not defined. Keep the class name from the starter code.")
        encoded = getattr(Codec(), ${JSON.stringify(codecMethods[0])})(*args)
        if not isinstance(encoded, str):
            raise Exception("${codecMethods[0]} must return a string, got %s" % type(encoded).__name__)
        result = getattr(Codec(), ${JSON.stringify(codecMethods[1])})(encoded)`
                : `        # Parse inputs based on detected types
        args = []
        _tree = None
${argLines}
        solution = Solution()

        method_name = ${questionTypes?.method ? JSON.stringify(questionTypes.method) : 'None'}
        if method_name is not None:
            if not callable(getattr(solution, method_name, None)):
                raise Exception("Solution has no method '%s'. Keep the method name from the starter code." % method_name)
        else:
            method_name = next((attr_name for attr_name in dir(solution)
                if not attr_name.startswith('_') and callable(getattr(solution, attr_name))), None)

        if not method_name:
            raise Exception("No solution method found in the Solution class")

        result = getattr(solution, method_name)(*args)`;

            // LeetCode grades in-place problems on the mutated input, whatever the method returns.
            const inPlaceBlock = questionTypes?.inPlace && !opsMode ? `

        if args:
            result = args[0]` : '';
            // An interactive robot is judged on what it cleaned, not on a return value.
            // The map of cleaned cells is read from references taken before the
            // solution ran and judged on the server against the hidden room.
            const robotBlock = !opsMode && inputTypes.includes('ROBOT_ROOM') ? `

        result = ["".join("1" if (r, c) in _robot_cells else "0" for c in range(width)) for r, width in enumerate(_robot_shape)]` : '';
            const marker = `__PREPALGO_RESULT_${randomBytes(8).toString('hex')}__`;

            // Get existing imports and required typing imports
            const existingImports = extractImports(code);
            const requiredTypingImports = getRequiredTypingImports(code);
            const codeWithoutImports = removeImports(code);

            const testCode = `
import json
import sys
import io
import contextlib
# LeetCode allows deep recursion (e.g. DFS over a 100 x 200 grid).
sys.setrecursionlimit(100000)

${existingImports}
${requiredTypingImports}

# Interactive APIs. Their state is name-mangled so solutions use the API.
class ArrayReader:
    """LeetCode 702: get(i) returns 2**31 - 1 past the end; limited queries."""
    _LIMIT = 100

    def __init__(self, values):
        self.__values = list(values)
        self.__calls = 0

    def get(self, index):
        self.__calls += 1
        if self.__calls > ArrayReader._LIMIT:
            raise Exception("ArrayReader.get was called more than %d times. Search in O(log n) queries." % ArrayReader._LIMIT)
        if not isinstance(index, int) or index < 0 or index >= len(self.__values):
            return 2147483647
        return self.__values[index]

class Robot:
    """LeetCode 489: starts facing up at an open cell of a hidden grid."""
    _DIRS = ((-1, 0), (0, 1), (1, 0), (0, -1))

    def __init__(self, room, row, col):
        self.__room = [list(r) for r in room]
        self.__pos = (row, col)
        self.__facing = 0
        self.__cleaned = set()
        self.__steps = 0

    def __tick(self):
        self.__steps += 1
        if self.__steps > 2000000:
            raise Exception("The robot made more than 2000000 moves. Avoid revisiting cells.")

    def move(self):
        self.__tick()
        dr, dc = Robot._DIRS[self.__facing]
        r, c = self.__pos[0] + dr, self.__pos[1] + dc
        if 0 <= r < len(self.__room) and 0 <= c < len(self.__room[r]) and self.__room[r][c] == 1:
            self.__pos = (r, c)
            return True
        return False

    def turnLeft(self):
        self.__tick()
        self.__facing = (self.__facing + 3) % 4

    def turnRight(self):
        self.__tick()
        self.__facing = (self.__facing + 1) % 4

    def clean(self):
        self.__tick()
        self.__cleaned.add(self.__pos)


def _robot_from(spec):
    return Robot(spec["room"], spec["row"], spec["col"])

# Data structure classes for trees and linked lists
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
        self.parent = None

def _find_node(root, val):
    """The node holding val, or a detached node when the tree lacks it."""
    stack = [root] if root else []
    while stack:
        node = stack.pop()
        if node.val == val:
            return node
        if node.left:
            stack.append(node.left)
        if node.right:
            stack.append(node.right)
    return TreeNode(val)

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

# Helper functions for building data structures
def buildTree(values):
    """Build a binary tree from a list of values (level-order traversal)"""
    if not values or values[0] is None:
        return None
    
    root = TreeNode(values[0])
    queue = [root]
    head = 0
    i = 1
    
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        
        # Left child
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            node.left.parent = node
            queue.append(node.left)
        i += 1
        
        # Right child
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            node.right.parent = node
            queue.append(node.right)
        i += 1
    
    return root

def buildLinkedList(values):
    """Build a linked list from a list of values"""
    if not values:
        return None
    
    head = ListNode(values[0])
    current = head
    
    for val in values[1:]:
        current.next = ListNode(val)
        current = current.next
    
    return head

# --- Structured inputs -------------------------------------------------------
#
# Some problems are about the shape of a structure rather than the values in
# it, so the structure cannot survive a round trip through a flat array. A
# cycle, a random pointer and a graph edge all disappear when a linked list is
# serialized the normal way.
#
# Each builder records the nodes it created. That record is what lets the
# serializers answer the two questions those problems actually ask: "which node
# did you return?" and "did you build new nodes, or hand back the originals?"

__INPUT_NODES = []

class GraphNode:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

class RandomListNode:
    def __init__(self, val=0, next=None, random=None):
        self.val = val
        self.next = next
        self.random = random

def buildCycleList(spec):
    """Build a linked list whose tail may link back to an earlier node.

    spec is {"values": [...], "pos": i}, where pos is the index the tail points
    at, or -1 for no cycle.
    """
    global __INPUT_NODES
    values = spec.get('values', [])
    pos = spec.get('pos', -1)
    if not values:
        __INPUT_NODES = []
        return None

    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if pos is not None and pos >= 0:
        if pos >= len(nodes):
            raise Exception("Test case points the tail at index %d of a %d node list" % (pos, len(nodes)))
        nodes[-1].next = nodes[pos]

    __INPUT_NODES = nodes
    return nodes[0]

def buildGraph(adjacency):
    """Build an undirected graph from a 1-indexed adjacency list."""
    global __INPUT_NODES
    if not adjacency:
        __INPUT_NODES = []
        return None

    nodes = [GraphNode(i + 1) for i in range(len(adjacency))]
    for i, neighbors in enumerate(adjacency):
        nodes[i].neighbors = [nodes[n - 1] for n in neighbors]

    __INPUT_NODES = nodes
    return nodes[0]

def buildRandomList(pairs):
    """Build a linked list with an extra random pointer.

    pairs is [[val, random_index_or_null], ...].
    """
    global __INPUT_NODES
    if not pairs:
        __INPUT_NODES = []
        return None

    nodes = [RandomListNode(p[0]) for p in pairs]
    for i, pair in enumerate(pairs):
        if i + 1 < len(nodes):
            nodes[i].next = nodes[i + 1]
        target = pair[1] if len(pair) > 1 else None
        nodes[i].random = nodes[target] if target is not None else None

    __INPUT_NODES = nodes
    return nodes[0]

def nodeToIndex(node):
    """Report which input node was returned, by position; -1 for None."""
    if node is None:
        return -1
    for i, candidate in enumerate(__INPUT_NODES):
        if candidate is node:
            return i
    raise Exception("Returned a node that is not part of the input list")

def _rejectSharedNodes(reached):
    """A copy problem is only solved if none of the originals come back."""
    originals = {id(n) for n in __INPUT_NODES}
    for node in reached:
        if id(node) in originals:
            raise Exception(
                "Returned the original nodes instead of a copy. "
                "Build new nodes rather than reusing the input."
            )

def graphToList(node):
    """Serialize a graph back to a 1-indexed adjacency list."""
    if node is None:
        return []

    seen = {}
    stack = [node]
    while stack:
        current = stack.pop()
        if current.val in seen:
            continue
        seen[current.val] = current
        for neighbor in current.neighbors:
            if neighbor.val not in seen:
                stack.append(neighbor)

    _rejectSharedNodes(seen.values())
    return [sorted(n.val for n in seen[v].neighbors) for v in sorted(seen)]

def randomListToList(head):
    """Serialize a random-pointer list to [[val, random_index_or_null], ...]."""
    nodes = []
    current = head
    while current is not None:
        nodes.append(current)
        current = current.next

    _rejectSharedNodes(nodes)

    position = {id(n): i for i, n in enumerate(nodes)}
    result = []
    for n in nodes:
        target = position.get(id(n.random)) if n.random is not None else None
        result.append([n.val, target])
    return result

def treeToList(root):
    """Convert a binary tree to a list (level-order traversal)"""
    if not root:
        return []
    result = []
    queue = [root]
    head = 0
    while head < len(queue):
        node = queue[head]
        head += 1
        if node:
            result.append(node.val)
            # Append children (can be None)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    # Remove trailing None values
    while result and result[-1] is None:
        result.pop()
    return result

def linkedListToList(head):
    """Convert a linked list to a list"""
    result = []
    current = head
    while current:
        result.append(current.val)
        current = current.next
    return result

# Capture print statements
class PrintCapture:
    def __init__(self):
        self.output = []
        self.size = 0

    def write(self, text):
        if self.size < 20000:
            self.output.append(text)
            self.size += len(text)

    def flush(self):
        pass

class _Rng:
    """Deterministic xorshift generator for authored large test inputs."""
    def __init__(self, seed=1):
        self.state = ((seed * 2654435761) & 0xFFFFFFFFFFFFFFFF) or 1

    def next(self):
        x = self.state
        x ^= (x << 13) & 0xFFFFFFFFFFFFFFFF
        x ^= x >> 7
        x ^= (x << 17) & 0xFFFFFFFFFFFFFFFF
        self.state = x
        return x

    def randint(self, lo, hi):
        return lo + self.next() % (hi - lo + 1)

    def choice(self, seq):
        return seq[self.next() % len(seq)]

    def shuffle(self, seq):
        for i in range(len(seq) - 1, 0, -1):
            j = self.next() % (i + 1)
            seq[i], seq[j] = seq[j], seq[i]
        return seq

    def ints(self, n, lo, hi):
        return [self.randint(lo, hi) for _ in range(n)]

    def word(self, n, alphabet='abcdefghijklmnopqrstuvwxyz'):
        return ''.join(self.choice(alphabet) for _ in range(n))

def _canon(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True)

def _normalize(value, mode):
    if mode == 'unordered' and isinstance(value, list):
        return sorted(value, key=_canon)
    if mode == 'unordered-nested' and isinstance(value, list):
        return sorted((_normalize(v, mode) for v in value), key=_canon)
    return value

def _has_float(value):
    if isinstance(value, float):
        return True
    if isinstance(value, list):
        return any(_has_float(v) for v in value)
    if isinstance(value, dict):
        return any(_has_float(v) for v in value.values())
    return False

def _report(value, mode):
    """Small values travel as JSON; large ones as a digest of their canonical form."""
    text = json.dumps(value)
    if len(text) <= ${INLINE_RESULT_LIMIT} or _has_float(value):
        return {'result': value}
    import hashlib
    digest = hashlib.sha256(_canon(_normalize(value, mode)).encode()).hexdigest()
    return {'digest': 'sha256:' + digest, 'size': len(text), 'preview': text[:200]}

def _generate(expression):
    return eval(expression, {'Rng': _Rng})

def _to_jsonable(value, depth=0):
    if depth > 200:
        raise Exception("Returned value is nested too deeply to grade")
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        if value != value or value in (float('inf'), float('-inf')):
            return str(value)
        return value
    if isinstance(value, dict):
        return {str(k): _to_jsonable(v, depth + 1) for k, v in value.items()}
    if isinstance(value, (set, frozenset)):
        items = [_to_jsonable(v, depth + 1) for v in value]
        try:
            return sorted(items)
        except TypeError:
            return items
    if isinstance(value, (list, tuple, range)) or hasattr(value, '__iter__'):
        return [_to_jsonable(v, depth + 1) for v in value]
    raise Exception("Return value of type '%s' cannot be graded" % type(value).__name__)

# Timeouts are enforced by the parent process and by RLIMIT_CPU inside the
# sandbox guard. A self-imposed SIGALRM was removed deliberately: submitted
# code can reset the alarm or mask the signal, so a child cannot be trusted to
# time itself out.

${nodeAlias}
${codeWithoutImports}

if __name__ == "__main__":
    # Only the returned value leaves the sandbox. The expected answer is never
    # part of this program and the verdict is decided by the server.
    print_capture = PrintCapture()
    original_stdout = sys.stdout
    try:
        sys.stdout = print_capture

${driverBlock}${inPlaceBlock}${robotBlock}

        output_type = ${JSON.stringify(String(expectedOutputType).toLowerCase())}

        # The structured types are checked first and by name. The generic
        # duck-typed checks below cannot tell a RandomListNode from a ListNode
        # (both have .val and .next), so letting them run first would quietly
        # serialize away the random pointer the problem is actually about.
        if output_type == 'node_index':
            result = nodeToIndex(result)
        elif output_type == 'tree_node':
            result = None if result is None else result.val
        elif output_type == 'graph':
            result = graphToList(result)
        elif output_type == 'random_list':
            result = randomListToList(result)
        elif result is None:
            # An empty tree or list is None in Python and [] when serialized.
            if output_type in ('tree', 'array', 'linkedlist'):
                result = []
        elif hasattr(result, 'val') and hasattr(result, 'left') and hasattr(result, 'right'):
            result = treeToList(result)
        elif hasattr(result, 'val') and hasattr(result, 'next'):
            result = linkedListToList(result)

        payload = _report(_to_jsonable(result), ${JSON.stringify(questionTypes?.checker ? 'checker' : (questionTypes?.compare ?? 'exact'))})
    except BaseException as e:
        payload = {'error': '%s: %s' % (type(e).__name__, e)}
    sys.stdout = original_stdout
    payload['debugOutput'] = ''.join(print_capture.output)[:20000]
    original_stdout.write(${JSON.stringify(marker)} + json.dumps(payload) + "\\n")
    original_stdout.flush()
`;

            const graded = await executeCase({ testCase, source: testCode, marker, questionTypes, language: 'python' });
            if (graded.stopReason) stopReason = graded.stopReason;
            results.push(graded.result);
        } catch (error) {
            getExecutionBudget()?.signal.throwIfAborted();
            if (error.statusCode) throw error;
            results.push(outcome(testCase, { status: 'error', error: error.message }));
        }
    }

    return results;
}; 