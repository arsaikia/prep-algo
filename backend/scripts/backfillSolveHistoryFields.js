import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SolveHistory from '../models/SolveHistory.js';
import Question from '../models/Question.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URI_DEV;

async function backfill() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const records = await SolveHistory.find({
        $or: [
            { questionGroup: { $exists: false } },
            { questionGroup: null },
        ],
    });

    console.log(`Found ${records.length} records to backfill`);

    let updated = 0;
    for (const record of records) {
        const question = await Question.findById(record.questionId);
        if (question) {
            record.questionGroup = question.group;
            record.questionDifficulty = question.difficulty;
            record.domain = 'algorithms';
            await record.save();
            updated++;
        }
    }

    console.log(`Backfilled ${updated} records`);
    await mongoose.disconnect();
}

backfill().catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
