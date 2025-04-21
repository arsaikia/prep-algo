import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Constants
const EXECUTION_TIMEOUT = 5000; // 5 seconds timeout

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
 * Run Python code against test cases
 * @param {string} code - The Python code to execute
 * @param {Array<{inputs: Array<string>, expectedOutput: string}>} testCases - Array of test cases
 * @returns {Promise<Array<{input: string, expectedOutput: string, actualOutput: string, isCorrect: boolean, error: string|null, debugOutput: string}>>}
 */
export const runPythonCode = async (code, testCases) => {
    const results = [];

    for (const testCase of testCases) {
        try {
            // Create a temporary Python file with the user's code and test case
            const tempFile = join(tmpdir(), `code_${Date.now()}.py`);

            // Convert input strings to Python literals
            const inputArgs = testCase.inputs.map(input => {
                try {
                    return `eval(${JSON.stringify(input)})`;
                } catch (e) {
                    return JSON.stringify(input);
                }
            });

            const testCode = `
import json
import signal
import sys
import io
import contextlib

${extractImports(code)}

# Capture print statements
class PrintCapture:
    def __init__(self):
        self.output = []
    
    def write(self, text):
        self.output.append(text)
    
    def flush(self):
        pass

def timeout_handler(signum, frame):
    print(json.dumps({
        'passed': False,
        'error': 'Execution timed out (exceeded ${EXECUTION_TIMEOUT / 1000} seconds)'
    }))
    sys.exit(1)

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(${Math.ceil(EXECUTION_TIMEOUT / 1000)})

${removeImports(code)}

if __name__ == "__main__":
    try:
        # Set up print capture
        print_capture = PrintCapture()
        original_stdout = sys.stdout
        sys.stdout = print_capture
        
        args = [${inputArgs.join(', ')}]
        solution = Solution()
        
        method_name = next((attr_name for attr_name in dir(solution) 
            if not attr_name.startswith('_') and callable(getattr(solution, attr_name))), None)
                
        if not method_name:
            raise Exception("No solution method found in the Solution class")
            
        result = getattr(solution, method_name)(*args)
        expected = eval(${JSON.stringify(testCase.expectedOutput)})
        
        # Restore stdout
        sys.stdout = original_stdout
        
        if isinstance(result, (list, tuple)):
            if isinstance(expected, list) and len(expected) > 0 and isinstance(expected[0], (list, tuple)):
                passed = any(sorted(result) == sorted(valid_solution) for valid_solution in expected)
            else:
                passed = sorted(result) == sorted(expected)
        else:
            passed = result == expected
            
        print(json.dumps({
            'passed': passed,
            'result': result,
            'expected': expected,
            'debugOutput': ''.join(print_capture.output)
        }))
    except Exception as e:
        # Restore stdout in case of exception
        if 'sys.stdout' in locals():
            sys.stdout = original_stdout
        
        print(json.dumps({
            'passed': False,
            'error': str(e),
            'debugOutput': ''.join(print_capture.output) if 'print_capture' in locals() else ''
        }))
`;

            await writeFile(tempFile, testCode);

            // Execute the Python code with timeout
            const result = await new Promise((resolve, reject) => {
                const python = spawn('python3', [tempFile]);
                let output = '';
                let error = '';

                const timeoutId = setTimeout(() => {
                    python.kill();
                    reject(new Error(`Execution timed out (exceeded ${EXECUTION_TIMEOUT / 1000} seconds)`));
                }, EXECUTION_TIMEOUT);

                python.stdout.on('data', (data) => output += data.toString());
                python.stderr.on('data', (data) => error += data.toString());

                python.on('close', (code) => {
                    clearTimeout(timeoutId);
                    if (code !== 0) {
                        reject(new Error(error || 'Execution failed'));
                    } else {
                        try {
                            const lines = output.trim().split('\n');
                            const lastLine = lines[lines.length - 1];
                            resolve(JSON.parse(lastLine));
                        } catch (e) {
                            reject(new Error('Invalid output format'));
                        }
                    }
                });
            });

            await unlink(tempFile);

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