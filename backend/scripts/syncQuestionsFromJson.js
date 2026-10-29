import './retiredMongoScript.js';
import mongoose from 'mongoose';
import Question from '../models/Question.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import NodeCache from 'node-cache';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize cache with same settings as middleware to clear it
const cache = new NodeCache({ stdTTL: 3600 });

const connectDB = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production'
            ? process.env.MONGO_URI
            : process.env.MONGO_URI_DEV;
        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

const loadQuestionsFromJson = async () => {
    try {
        const jsonPath = path.join(__dirname, '../_data/questions.json');
        const jsonData = await fs.readFile(jsonPath, 'utf8');
        return JSON.parse(jsonData);
    } catch (error) {
        console.error('❌ Error loading questions.json:', error);
        throw error;
    }
};

const clearQuestionCache = () => {
    // Clear any cached question responses
    const keys = cache.keys();
    const questionKeys = keys.filter(key => key.includes('/api/v1/questions/'));

    if (questionKeys.length > 0) {
        questionKeys.forEach(key => cache.del(key));
        console.log(`🗑️  Cleared ${questionKeys.length} cached question responses`);
    }
};

const syncQuestionsToDatabase = async () => {
    try {
        await connectDB();

        console.log('📖 Loading questions from JSON file...');
        const questionsFromJson = await loadQuestionsFromJson();

        console.log(`📊 Found ${questionsFromJson.length} questions in JSON file`);

        let updated = 0;
        let created = 0;
        let skipped = 0;
        let errors = 0;

        for (const questionData of questionsFromJson) {
            try {
                // Find existing question by link
                const existingQuestion = await Question.findOne({ link: questionData.link });

                if (existingQuestion) {
                    // Check if JSON has more complete data than DB
                    const hasDescription = questionData.description && questionData.description.trim() !== '';
                    const hasTestCases = questionData.testCases && questionData.testCases.length > 0;
                    const hasExampleTestCases = questionData.exampleTestCases && questionData.exampleTestCases.length > 0;
                    const hasTemplates = questionData.templates && Object.keys(questionData.templates).length > 0;

                    const needsUpdate = hasDescription || hasTestCases || hasExampleTestCases || hasTemplates;

                    if (needsUpdate) {
                        // Prepare update data - only include fields that exist in JSON
                        const updateData = {
                            name: questionData.name,
                            group: questionData.group,
                            difficulty: questionData.difficulty
                        };

                        if (hasDescription) {
                            updateData.description = questionData.description;
                        }

                        if (hasTestCases) {
                            updateData.testCases = questionData.testCases;
                        }

                        if (hasExampleTestCases) {
                            updateData.exampleTestCases = questionData.exampleTestCases;
                        }

                        if (hasTemplates) {
                            updateData.templates = questionData.templates;
                        }

                        await Question.findByIdAndUpdate(existingQuestion._id, updateData, { new: true });

                        console.log(`🔄 Updated: ${questionData.name}`);
                        if (hasDescription) console.log(`   ✓ Added description`);
                        if (hasTestCases) console.log(`   ✓ Added ${questionData.testCases.length} test cases`);
                        if (hasExampleTestCases) console.log(`   ✓ Added ${questionData.exampleTestCases.length} example test cases`);
                        if (hasTemplates) console.log(`   ✓ Added templates for: ${Object.keys(questionData.templates).join(', ')}`);

                        updated++;
                    } else {
                        console.log(`⏭️  Skipped: ${questionData.name} (no additional data to sync)`);
                        skipped++;
                    }
                } else {
                    // Create new question
                    const newQuestion = new Question({
                        _id: questionData._id,
                        name: questionData.name,
                        link: questionData.link,
                        group: questionData.group,
                        difficulty: questionData.difficulty,
                        description: questionData.description || '',
                        list: questionData.list || ['ALL'],
                        order: questionData.order || 1,
                        templates: questionData.templates || {},
                        testCases: questionData.testCases || [],
                        exampleTestCases: questionData.exampleTestCases || [],
                    });

                    await newQuestion.save();
                    console.log(`✨ Created: ${questionData.name}`);
                    created++;
                }
            } catch (error) {
                console.error(`❌ Error processing ${questionData.name}:`, error.message);
                errors++;
            }
        }

        // Clear cache after successful updates
        if (updated > 0 || created > 0) {
            clearQuestionCache();
        }

        console.log('\n📈 Sync Summary:');
        console.log(`   ✨ Created: ${created} questions`);
        console.log(`   🔄 Updated: ${updated} questions`);
        console.log(`   ⏭️  Skipped: ${skipped} questions`);
        console.log(`   ❌ Errors: ${errors} questions`);
        console.log(`   📊 Total processed: ${questionsFromJson.length} questions`);

        if (errors === 0) {
            console.log('\n🎉 All questions synced successfully!');
        } else {
            console.log(`\n⚠️  Completed with ${errors} errors. Check the logs above for details.`);
        }

    } catch (error) {
        console.error('❌ Error syncing questions:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Command line argument parsing
const args = process.argv.slice(2);
const specificQuestion = args.find(arg => arg.startsWith('--question='))?.split('=')[1];
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to the database');
}

if (specificQuestion) {
    console.log(`🎯 Syncing specific question: ${specificQuestion}`);
}

// Main execution
syncQuestionsToDatabase(); 