import './retiredMongoScript.js';
import mongoose from 'mongoose';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const run = async () => {
    const uri = process.env.MONGO_URI_DEV || process.env.MONGO_URI;
    if (!uri) {
        console.error('No MONGO_URI found in environment');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Backfill existing questions with domain + answerFormat
    const questionResult = await db.collection('questions').updateMany(
        { domain: { $exists: false } },
        { $set: { domain: 'algorithms', answerFormat: 'code' } }
    );
    console.log(`Backfilled ${questionResult.modifiedCount} questions with domain='algorithms'`);

    // 2. Backfill solve history domain
    const historyResult = await db.collection('solvehistories').updateMany(
        { domain: { $exists: false } },
        { $set: { domain: 'algorithms' } }
    );
    console.log(`Backfilled ${historyResult.modifiedCount} solve histories with domain='algorithms'`);

    // 3. Load and insert system design questions
    const sdPath = join(__dirname, '..', '_data', 'system_design_questions.json');
    const sdQuestions = JSON.parse(await readFile(sdPath, 'utf-8'));
    for (const q of sdQuestions) {
        const exists = await db.collection('questions').findOne({ link: q.link });
        if (!exists) {
            await db.collection('questions').insertOne({
                _id: crypto.randomUUID(),
                ...q,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    }
    console.log(`Inserted ${sdQuestions.length} system design questions (skipped existing)`);

    // 4. Load and insert frontend questions
    const fePath = join(__dirname, '..', '_data', 'frontend_questions.json');
    const feQuestions = JSON.parse(await readFile(fePath, 'utf-8'));
    for (const q of feQuestions) {
        const exists = await db.collection('questions').findOne({ link: q.link });
        if (!exists) {
            await db.collection('questions').insertOne({
                _id: crypto.randomUUID(),
                ...q,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    }
    console.log(`Inserted ${feQuestions.length} frontend questions (skipped existing)`);

    // 5. Verify
    const domains = await db.collection('questions').distinct('domain');
    const counts = {};
    for (const d of domains) {
        counts[d] = await db.collection('questions').countDocuments({ domain: d });
    }
    console.log('Domain distribution:', counts);

    await mongoose.disconnect();
    console.log('Migration complete');
};

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
