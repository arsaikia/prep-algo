import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const EXECUTION_TIMEOUT = 5000; // 5 seconds timeout

/**
 * Run Python code against test cases
 * @param {string} code - The Python code to execute
 * @param {Array<{inputs: Array<string>, expectedOutput: string, isExample: boolean}>} testCases - Array of test cases
 * @returns {Promise<Array<{input: string, expectedOutput: string, actualOutput: string, isCorrect: boolean, error: string|null, isExample: boolean}>>}
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
                    // Try to evaluate the input as a Python literal
                    return `eval(${JSON.stringify(input)})`;
                } catch (e) {
                    // If evaluation fails, treat it as a string
                    return JSON.stringify(input);
                }
            });

            const testCode = `
import json
import signal
import sys

def timeout_handler(signum, frame):
    print(json.dumps({
        'passed': False,
        'error': 'Execution timed out (exceeded ${EXECUTION_TIMEOUT / 1000} seconds)'
    }))
    sys.exit(1)

# Set timeout handler
signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(${Math.ceil(EXECUTION_TIMEOUT / 1000)})

${code}

# Test case execution
if __name__ == "__main__":
    try:
        # Convert input strings to Python objects
        args = [${inputArgs.join(', ')}]
        
        # Execute the solution
        result = solution(*args)
        
        # Convert expected output to Python object
        expected = eval(${JSON.stringify(testCase.expectedOutput)})
        
        # Compare results
        # For lists and tuples, sort them to ignore order
        if isinstance(result, (list, tuple)):
            if isinstance(expected, list) and len(expected) > 0 and isinstance(expected[0], (list, tuple)):
                # Multiple valid solutions case
                passed = any(sorted(result) == sorted(valid_solution) for valid_solution in expected)
            else:
                # Single solution case
                passed = sorted(result) == sorted(expected)
        else:
            passed = result == expected
            
        output = {
            'passed': passed,
            'result': result,
            'expected': expected
        }
        print(json.dumps(output))
    except Exception as e:
        error_output = {
            'passed': False,
            'error': str(e)
        }
        print(json.dumps(error_output))
`;

            await writeFile(tempFile, testCode);

            // Execute the Python code with timeout
            const result = await new Promise((resolve, reject) => {
                const python = spawn('python3', [tempFile]);
                let output = '';
                let error = '';

                // Set up process timeout
                const timeoutId = setTimeout(() => {
                    python.kill();
                    reject(new Error(`Execution timed out (exceeded ${EXECUTION_TIMEOUT / 1000} seconds)`));
                }, EXECUTION_TIMEOUT);

                python.stdout.on('data', (data) => {
                    output += data.toString();
                });

                python.stderr.on('data', (data) => {
                    error += data.toString();
                });

                python.on('close', (code) => {
                    clearTimeout(timeoutId);
                    if (code !== 0) {
                        reject(new Error(error || 'Execution failed'));
                    } else {
                        try {
                            // Split output by lines and get the last line which should be our JSON
                            const lines = output.trim().split('\n');
                            const lastLine = lines[lines.length - 1];
                            const result = JSON.parse(lastLine);
                            resolve(result);
                        } catch (e) {
                            console.error('Debug - Parse error:', e);
                            reject(new Error('Invalid output format'));
                        }
                    }
                });
            });

            // Clean up the temporary file
            await unlink(tempFile);

            results.push({
                input: testCase.inputs,
                expectedOutput: testCase.expectedOutput,
                ...result
            });
        } catch (error) {
            results.push({
                input: testCase.inputs,
                expectedOutput: testCase.expectedOutput,
                passed: false,
                error: error.message
            });
        }
    }

    return results;
}; 