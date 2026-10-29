import asyncHandler from '../middleware/async.js';
import { listHistory, updateAnnotations } from '../repositories/progress.js';
import { getItemByLegacyId, toQuestionSummary } from '../utils/contentStore.js';
import ErrorResponse from '../utils/errorResponse.js';

const getSolveHistory = asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 100);
    const offset = Number(req.query.offset ?? 0);
    let cursor = null;
    if (req.query.cursor !== undefined) {
        try {
            if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 2048) throw new Error('Invalid cursor');
            cursor = JSON.parse(Buffer.from(req.query.cursor, 'base64url').toString('utf8'));
            if (!cursor || typeof cursor.at !== 'string' || !Number.isFinite(Date.parse(cursor.at)) ||
                typeof cursor.id !== 'string' || !cursor.id || offset !== 0) throw new Error('Invalid cursor');
        } catch {
            throw new ErrorResponse('Invalid history cursor; omit offset when using cursor', 400);
        }
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
        !Number.isInteger(offset) || offset < 0) {
        throw new ErrorResponse('limit must be 1–100 and offset must be a nonnegative integer', 400);
    }
    const history = await listHistory(req.params.userId, limit, offset, cursor);
    const data = history.map(entry => ({
        ...entry,
        questionId: toQuestionSummary(getItemByLegacyId(entry.questionId)),
    }));
    const last = history.at(-1);
    const nextCursor = data.length === limit && last?.lastAttemptAt
        ? Buffer.from(JSON.stringify({ at: last.lastAttemptAt, id: last.questionId })).toString('base64url') : null;
    res.status(200).json({ success: true, count: data.length, limit, offset, nextCursor, data });
});

// Only grading may create attempts or increment solve counts.
const updateSolveHistory = asyncHandler(async (req, res) => {
    const { userId, questionId, ...annotations } = req.body;
    const data = await updateAnnotations(userId, questionId, annotations);
    res.status(200).json({ success: true, data });
});

export { getSolveHistory, updateSolveHistory };
