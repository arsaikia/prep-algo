import { executePython, POLICY } from './sandbox/index.js';

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
const generateInputParser = (input, type) => {
    switch (type) {
        case 'ARRAY':
            return `json.loads(${JSON.stringify(input)})`;
        case 'TREE':
            return `buildTree(json.loads(${JSON.stringify(input)}))`;
        case 'LINKEDLIST':
            return `buildLinkedList(json.loads(${JSON.stringify(input)}))`;
        case 'STRING':
            return `json.loads(${JSON.stringify(input)})`; // Remove quotes
        case 'BOOLEAN':
            return `json.loads(${JSON.stringify(input)})`;
        case 'NUMBER':
            return `json.loads(${JSON.stringify(input)})`;
        default:
            return `eval(${JSON.stringify(input)})`;
    }
};

/**
 * Run Python code against test cases
 * @param {string} code - The Python code to execute
 * @param {Array<{inputs: Array<string>, expectedOutput: string}>} testCases - Array of test cases
 * @param {Object} questionTypes - Optional question types object with inputs and output arrays
 * @returns {Promise<Array<{input: string, expectedOutput: string, actualOutput: string, isCorrect: boolean, error: string|null, debugOutput: string}>>}
 */
export const runPythonCode = async (code, testCases, questionTypes = null) => {
    const results = [];

    for (const testCase of testCases) {
        try {
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

            if (opsMode) {
                // Ops problems are always judged on the list of per-call return
                // values, whatever the content happens to declare as the output.
                expectedOutputType = 'ARRAY';
            }

            // Generate input parsing code
            const inputArgs = testCase.inputs.map((input, index) =>
                generateInputParser(input, inputTypes[index])
            );

            const driverBlock = opsMode
                ? `        # Replay a recorded call sequence against one instance.
        calls = json.loads(${JSON.stringify(testCase.inputs[0] ?? '[]')})
        call_args = json.loads(${JSON.stringify(testCase.inputs[1] ?? '[]')})

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
                : `        # Parse inputs based on detected types
        args = [${inputArgs.join(', ')}]
        solution = Solution()

        method_name = next((attr_name for attr_name in dir(solution)
            if not attr_name.startswith('_') and callable(getattr(solution, attr_name))), None)

        if not method_name:
            raise Exception("No solution method found in the Solution class")

        result = getattr(solution, method_name)(*args)`;

            // Get existing imports and required typing imports
            const existingImports = extractImports(code);
            const requiredTypingImports = getRequiredTypingImports(code);
            const codeWithoutImports = removeImports(code);

            const testCode = `
import json
import sys
import io
import contextlib

${existingImports}
${requiredTypingImports}

# Data structure classes for trees and linked lists
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

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
    i = 1
    
    while queue and i < len(values):
        node = queue.pop(0)
        
        # Left child
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1
        
        # Right child
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
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

def treeToList(root):
    """Convert a binary tree to a list (level-order traversal)"""
    if not root:
        return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
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
    
    def write(self, text):
        self.output.append(text)
    
    def flush(self):
        pass

# Timeouts are enforced by the parent process and by RLIMIT_CPU inside the
# sandbox guard. A self-imposed SIGALRM was removed deliberately: submitted
# code can reset the alarm or mask the signal, so a child cannot be trusted to
# time itself out.

${codeWithoutImports}

if __name__ == "__main__":
    try:
        # Set up print capture
        print_capture = PrintCapture()
        original_stdout = sys.stdout
        sys.stdout = print_capture
        
${driverBlock}
        
        # Handle expected output - parse it based on detected type
        expected_str = ${JSON.stringify(testCase.expectedOutput)}
        expected_type = ${JSON.stringify(String(expectedOutputType).toLowerCase())}
        
        # Normalize output based on actual result type
        if result is None:
            # Handle None result - check if expected is empty list
            if expected_type == 'tree' or expected_type == 'array':
                result = []
        elif hasattr(result, 'val') and hasattr(result, 'left') and hasattr(result, 'right'):
            # TreeNode result - convert to list
            result = treeToList(result)
        elif hasattr(result, 'val') and hasattr(result, 'next'):
            # ListNode result - convert to list
            result = linkedListToList(result)
        
        try:
            if expected_type == 'array':
                expected = json.loads(expected_str)
            elif expected_type == 'tree':
                expected = json.loads(expected_str)
            elif expected_type == 'linkedlist':
                expected = json.loads(expected_str)
            elif expected_type == 'string':
                expected = json.loads(expected_str)
            elif expected_type == 'boolean':
                expected = json.loads(expected_str)
            elif expected_type == 'number':
                expected = json.loads(expected_str)
            else:
                expected = eval(expected_str)
        except:
            expected = expected_str
        
        # Restore stdout
        sys.stdout = original_stdout
        
        # Compare results - handle different types intelligently
        def compare_results(actual, expected):
            # Handle boolean vs string conversion (common issue)
            if isinstance(actual, bool) and isinstance(expected, str):
                if expected.lower() in ['true', 'false']:
                    return str(actual).lower() == expected.lower()
            elif isinstance(actual, str) and isinstance(expected, bool):
                if actual.lower() in ['true', 'false']:
                    return actual.lower() == str(expected).lower()
            
            # Both are lists/arrays - compare directly (don't sort if contains None)
            if isinstance(actual, (list, tuple)) and isinstance(expected, (list, tuple)):
                return actual == expected
            # One is list, other is string - try to convert string to list
            elif isinstance(actual, (list, tuple)) and isinstance(expected, str):
                try:
                    expected_parsed = eval(expected)
                    if isinstance(expected_parsed, (list, tuple)):
                        return actual == expected_parsed
                except:
                    pass
                return str(actual) == expected
            elif isinstance(actual, str) and isinstance(expected, (list, tuple)):
                try:
                    actual_parsed = eval(actual)
                    if isinstance(actual_parsed, (list, tuple)):
                        return actual_parsed == expected
                except:
                    pass
                return actual == str(expected)
            # Direct comparison for same types
            else:
                return actual == expected
        
        passed = compare_results(result, expected)
        
        # Convert boolean results to string format for consistency with expected output
        formatted_result = result
        if isinstance(result, bool) and isinstance(expected, str):
            if expected.lower() in ['true', 'false']:
                formatted_result = str(result).lower()
            
        print(json.dumps({
            'passed': passed,
            'result': formatted_result,
            'expected': expected,
            'debugOutput': ''.join(print_capture.output)
        }))
    except Exception as e:
        # Restore stdout before reporting, otherwise the verdict below is
        # swallowed by the capture buffer and the caller sees an empty stdout.
        if 'original_stdout' in locals():
            sys.stdout = original_stdout
        
        print(json.dumps({
            'passed': False,
            'error': f'{type(e).__name__}: {e}',
            'debugOutput': ''.join(print_capture.output) if 'print_capture' in locals() else ''
        }))
`;

            const execution = await executePython({
                source: testCode,
                timeoutMs: EXECUTION_TIMEOUT,
            });

            if (execution.timedOut) {
                throw new Error(`Execution timed out (exceeded ${EXECUTION_TIMEOUT / 1000} seconds)`);
            }
            if (execution.oom) {
                throw new Error(`Execution exceeded the ${POLICY.memoryMb}MB memory limit`);
            }
            if (execution.exitCode !== 0) {
                throw new Error(execution.stderr.trim() || 'Execution failed');
            }

            // The harness prints a JSON verdict as its final line; anything
            // before it is the submission's own stdout.
            let result;
            try {
                const lines = execution.stdout.trim().split('\n');
                result = JSON.parse(lines[lines.length - 1]);
            } catch {
                throw new Error('Invalid output format');
            }

            results.push({
                input: testCase.inputs,
                expectedOutput: testCase.expectedOutput,
                actualOutput: result.result,
                passed: result.passed,
                error: result.error || null,
                debugOutput: result.debugOutput || ''
            });
        } catch (error) {
            results.push({
                input: testCase.inputs,
                expectedOutput: testCase.expectedOutput,
                actualOutput: null,
                passed: false,
                error: error.message,
                debugOutput: ''
            });
        }
    }

    return results;
}; 