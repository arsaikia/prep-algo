// Simple test to debug the comparison logic
const testCase = {
    inputs: ["[2,7,11,15]", "9"],
    expectedOutput: "[0,1]"
};

console.log('=== DEBUG TEST ===');
console.log('Test case inputs:', testCase.inputs);
console.log('Test case expected output:', testCase.expectedOutput);
console.log('Expected output type:', typeof testCase.expectedOutput);

// Simulate what happens in the Python code
const expectedStr = JSON.stringify(testCase.expectedOutput);
console.log('JSON.stringify result:', expectedStr);

// This is what gets put into the Python code
console.log('What goes into Python eval():', expectedStr);

// Simulate the Python eval
try {
    const result = eval(expectedStr);
    console.log('JavaScript eval result:', result);
    console.log('JavaScript eval result type:', typeof result);
} catch (e) {
    console.log('JavaScript eval error:', e.message);
}

// Test the comparison
const actualOutput = [0, 1];
const expectedOutput = "[0,1]";

console.log('\n=== COMPARISON TEST ===');
console.log('Actual output:', actualOutput, typeof actualOutput);
console.log('Expected output:', expectedOutput, typeof expectedOutput);

// Test parsing expected
let parsedExpected;
try {
    parsedExpected = eval(expectedOutput);
    console.log('Parsed expected:', parsedExpected, typeof parsedExpected);
} catch (e) {
    parsedExpected = expectedOutput;
    console.log('Parse failed, using string:', parsedExpected);
}

// Test comparison
const isEqual = JSON.stringify(actualOutput) === JSON.stringify(parsedExpected);
console.log('Arrays equal?', isEqual);
console.log('Direct equal?', actualOutput === parsedExpected);
console.log('String comparison:', JSON.stringify(actualOutput) === expectedOutput); 