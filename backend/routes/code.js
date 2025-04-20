import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Question from '../models/Question.js';

const router = express.Router();
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to create a temporary Python file
const createTempFile = async (code) => {
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    const tempFile = path.join(tempDir, `temp_${Date.now()}.py`);
    await fs.promises.writeFile(tempFile, code);
    return tempFile;
};

// Helper function to run Python code with test cases
const runPythonCode = async (code, testCases) => {
    const tempFile = await createTempFile(code);
    const results = [];

    try {
        for (const testCase of testCases) {
            try {
                const { stdout, stderr } = await execAsync(`python3 ${tempFile}`, {
                    input: testCase.input
                });

                const output = stdout.trim();
                const isCorrect = output === testCase.expectedOutput;

                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: output,
                    isCorrect,
                    error: stderr || null
                });
            } catch (error) {
                results.push({
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput,
                    actualOutput: null,
                    isCorrect: false,
                    error: error.message
                });
            }
        }
    } finally {
        // Clean up temp file
        try {
            await fs.promises.unlink(tempFile);
        } catch (error) {
            console.error('Error cleaning up temp file:', error);
        }
    }

    return results;
};

// Execute code with example test cases
router.post('/execute/example', async (req, res) => {
    try {
        const { code, questionId } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        if (!questionId) {
            return res.status(400).json({ error: 'Question ID is required' });
        }

        // Get question from database
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (!question.exampleTestCases || question.exampleTestCases.length === 0) {
            return res.status(400).json({ error: 'No example test cases available for this question' });
        }

        const results = await runPythonCode(code, question.exampleTestCases);

        res.json({
            results,
            summary: {
                total: results.length,
                passed: results.filter(r => r.isCorrect).length,
                failed: results.filter(r => !r.isCorrect).length
            }
        });
    } catch (error) {
        console.error('Error executing code:', error);
        res.status(500).json({ error: 'Failed to execute code' });
    }
});

// Execute code with actual test cases
router.post('/execute/submit', async (req, res) => {
    try {
        const { code, questionId } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        if (!questionId) {
            return res.status(400).json({ error: 'Question ID is required' });
        }

        // Get question from database
        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (!question.testCases || question.testCases.length === 0) {
            return res.status(400).json({ error: 'No test cases available for this question' });
        }

        const results = await runPythonCode(code, question.testCases);

        // Only return whether the submission passed or failed, not the actual test cases
        const passed = results.every(r => r.isCorrect);

        res.json({
            passed,
            summary: {
                total: results.length,
                passed: results.filter(r => r.isCorrect).length,
                failed: results.filter(r => !r.isCorrect).length
            }
        });
    } catch (error) {
        console.error('Error executing code:', error);
        res.status(500).json({ error: 'Failed to execute code' });
    }
});

export default router; 