import asyncHandler from '../middleware/async.js';
import { listProgress } from '../repositories/progress.js';

/*
 * @desc     Per-user solve progress, with no content attached
 * @route    GET /api/v1/progress/:userId
 * @access   Private (self only)
 *
 * The content half of this used to come from the same query: the old
 * `/questions/get-questions/:userId` joined every question document onto
 * every progress row and returned ~133 KB, almost all of it static. Content
 * now ships from the CDN, so the API's only remaining job is the part that
 * genuinely differs per user and per request.
 *
 * Stable catalog IDs are retained so existing clients and imported test data
 * continue to join progress to the CDN's legacyId.
 */
const getProgress = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const rows = await listProgress(userId);

    const items = rows.map((row) => ({
        questionId: String(row.questionId),
        solveCount: row.solveCount,
        firstSolvedAt: row.firstSolvedAt,
        lastSolvedAt: row.lastUpdatedAt,
        domain: row.domain,
    }));

    res.status(200).json({ success: true, count: items.length, data: items });
});

export { getProgress };
