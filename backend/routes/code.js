import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Question from '../models/Question.js';
import { runPythonCode } from '../utils/codeExecution.js';

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

// Execute code with example test cases
router.post('/execute/example', async (req, res) => {
    try {
        const { code, questionId } = req.body;

        console.log('🔍 BACKEND: Received request for questionId:', questionId);
        console.log('🔍 BACKEND: Code length:', code?.length || 0);

        if (!code) {
            return res.status(400).json({ error: 'Code is required' });
        }

        if (!questionId) {
            return res.status(400).json({ error: 'Question ID is required' });
        }

        // Get question from database
        const question = await Question.findOne({
            $or: [
                { link: questionId },
                { link: `${questionId}/` }
            ]
        });

        if (!question) {
            console.log('🔍 BACKEND: Question not found for ID:', questionId);
            return res.status(404).json({ error: 'Question not found' });
        }

        console.log('🔍 BACKEND: Found question:', question.name);
        console.log('🔍 BACKEND: Example test cases count:', question.exampleTestCases?.length || 0);

        if (!question.exampleTestCases || question.exampleTestCases.length === 0) {
            return res.status(400).json({ error: 'No example test cases available for this question' });
        }

        console.log('🔍 BACKEND: First test case:', question.exampleTestCases[0]);

        // Use the runPythonCode function from codeExecution.js
        const results = await runPythonCode(code, question.exampleTestCases);

        console.log('🔍 BACKEND: Execution results:', results);

        const response = {
            results,
            summary: {
                total: results.length,
                passed: results.filter(r => r.passed).length,
                failed: results.filter(r => !r.passed).length
            }
        };

        console.log('🔍 BACKEND: Sending response:', response);

        res.json(response);
    } catch (error) {
        console.error('🔍 BACKEND: Error executing code:', error);
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
        const question = await Question.findOne({
            $or: [
                { link: questionId },
                { link: `${questionId}/` }
            ]
        });

        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        if (!question.testCases || question.testCases.length === 0) {
            return res.status(400).json({ error: 'No test cases available for this question' });
        }

        // Use the runPythonCode function from codeExecution.js
        const results = await runPythonCode(code, question.testCases);

        // Only return whether the submission passed or failed, not the actual test cases
        const passed = results.every(r => r.passed);

        res.json({
            passed,
            summary: {
                total: results.length,
                passed: results.filter(r => r.passed).length,
                failed: results.filter(r => !r.passed).length
            }
        });
    } catch (error) {
        console.error('Error executing code:', error);
        res.status(500).json({ error: 'Failed to execute code' });
    }
});

export default router; 