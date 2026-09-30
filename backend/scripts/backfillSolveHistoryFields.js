import mongoose from 'mongoose';

import SolveHistory from '../models/SolveHistory.js';
import { getItemByLegacyId } from '../utils/contentStore.js';

/**
 * Backfill `domain`, `questionGroup` and `questionDifficulty` on solve
 * records written before those fields existed.
 *
 * Needed once when production moves off the pre-multi-domain backend: the
 * spaced-repetition query filters on `domain`, and a schema default does not
 * match a field that is absent from the stored document.
 *
 * Fields come from the content catalog, joined on the record's `questionId`
 * (the item's `legacyId`), so this does not read the retired `questions`
 * collection. Run `npm run build:content` first.
 *
 * Dry run by default. The target is BACKFILL_MONGO_URI, deliberately not
 * MONGO_URI: `.env` files name clusters that production does not use. The
 * script prints the target host before touching it.
 *
 * Usage:  BACKFILL_MONGO_URI=... node scripts/backfillSolveHistoryFields.js [--apply]
 */

const APPLY = process.argv.includes('--apply');
const MISSING = [
    { domain: { $exists: false } },
    { questionGroup: { $exists: false } },
    { questionGroup: null },
    { questionDifficulty: { $exists: false } },
];

const redact = (uri) => uri.replace(/\/\/[^@/]+@/, '//***@');

async function backfill() {
    const uri = process.env.BACKFILL_MONGO_URI;
    if (!uri) {
        console.error('BACKFILL_MONGO_URI is not set. Refusing to guess a database.');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log(`Connected to ${redact(uri)} (${APPLY ? 'APPLY' : 'dry run'})`);

    const records = await SolveHistory.find({ $or: MISSING })
        .select('_id questionId domain questionGroup questionDifficulty')
        .lean();

    const ops = [];
    const unknown = new Set();
    for (const record of records) {
        const item = getItemByLegacyId(record.questionId);
        const set = {};
        if (!record.domain) set.domain = item?.domain || 'algorithms';
        if (item && !record.questionGroup && item.group) set.questionGroup = item.group;
        if (item && !record.questionDifficulty && item.difficulty) {
            set.questionDifficulty = item.difficulty;
        }
        if (!item) unknown.add(String(record.questionId));
        if (Object.keys(set).length) {
            ops.push({ updateOne: { filter: { _id: record._id }, update: { $set: set } } });
        }
    }

    console.log(`${records.length} records missing fields; ${ops.length} updatable`);
    if (unknown.size) {
        console.log(`${unknown.size} question ids not in the catalog (domain defaulted to algorithms):`);
        console.log([...unknown].slice(0, 20).join('\n'));
    }

    if (APPLY && ops.length) {
        const result = await SolveHistory.bulkWrite(ops, { ordered: false });
        console.log(`Updated ${result.modifiedCount} records`);
    } else if (!APPLY) {
        console.log('Dry run: nothing written. Re-run with --apply to write.');
    }

    await mongoose.disconnect();
}

backfill().catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
});
