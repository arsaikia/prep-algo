import asyncHandler from '../middleware/async.js';
import SolveHistory from '../models/SolveHistory.js';

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
 * Keyed by `questionId` because progress is still keyed by ObjectId. The
 * client joins it to content via each item's `legacyId`. Step 6 rekeys both
 * sides to `slug` and this mapping disappears.
 */
const getProgress = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Projected deliberately. `solveHistory[]` on these documents is an
    // unbounded append-only array; selecting the whole document would grow
    // this response without bound as a user practises.
    const rows = await SolveHistory.find({ userId })
        .select('questionId solveCount firstSolvedAt lastUpdatedAt domain')
        .lean();

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
