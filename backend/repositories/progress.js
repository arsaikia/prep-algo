import { randomUUID, createHash } from 'node:crypto';
import { query, withTransaction } from '../config/postgres.js';
import ErrorResponse from '../utils/errorResponse.js';
import { updateProfileForAttempt } from '../models/UserProfile.js';

export function submissionHash(contentId, payload) {
    return createHash('sha256').update(JSON.stringify([contentId, payload])).digest('hex');
}

function assertSameSubmission(row, contentId, requestHash) {
    if (row.content_id !== contentId || row.request_hash !== requestHash) {
        throw new ErrorResponse('Submission ID was already used for a different request', 409);
    }
}

export async function findSubmission(userId, submissionKey, contentId, requestHash) {
    const { rows } = await query(
        'SELECT content_id, request_hash, result FROM attempts WHERE user_id = $1 AND submission_key = $2',
        [userId, submissionKey],
    );
    if (!rows[0]) return null;
    assertSameSubmission(rows[0], contentId, requestHash);
    return rows[0].result;
}

export async function recordAttempt({
    userId, contentId, submissionKey, requestHash, success, result,
    timeSpent = null, context = {},
}) {
    if (timeSpent !== null && (!Number.isFinite(timeSpent) || timeSpent < 0 || timeSpent > 86400)) {
        throw new ErrorResponse('timeSpent must be between 0 and 86400 seconds', 400);
    }
    return withTransaction(async (client) => {
        // A per-user lock orders duplicate submissions and profile/batch updates.
        const user = await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
        if (!user.rowCount) throw new ErrorResponse('User not found', 404);
        const existing = await client.query(
            'SELECT content_id, request_hash, result FROM attempts WHERE user_id = $1 AND submission_key = $2',
            [userId, submissionKey],
        );
        if (existing.rows[0]) {
            assertSameSubmission(existing.rows[0], contentId, requestHash);
            return existing.rows[0].result;
        }

        const savedResult = { ...result, attemptSaved: true, progressSaved: success };
        const now = new Date();
        await client.query(
            `INSERT INTO attempts
                (id, user_id, content_id, submission_key, request_hash, success, occurred_at, time_spent, context, result)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [randomUUID(), userId, contentId, submissionKey, requestHash, success, now,
                timeSpent, JSON.stringify(context), JSON.stringify(savedResult)],
        );
        await client.query(
            `INSERT INTO content_progress
                (id,user_id,content_id,solve_count,attempt_count,first_solved_at,last_solved_at,last_attempt_at,
                 average_time_to_solve,timed_solve_count)
             VALUES ($1,$2,$3,$4,1,$5,$5,$6,$7,$8)
             ON CONFLICT (user_id,content_id) DO UPDATE SET
                solve_count = content_progress.solve_count + EXCLUDED.solve_count,
                attempt_count = content_progress.attempt_count + 1,
                first_solved_at = COALESCE(content_progress.first_solved_at, EXCLUDED.first_solved_at),
                last_solved_at = COALESCE(EXCLUDED.last_solved_at, content_progress.last_solved_at),
                last_attempt_at = EXCLUDED.last_attempt_at,
                average_time_to_solve = CASE WHEN EXCLUDED.timed_solve_count = 1 THEN
                    (COALESCE(content_progress.average_time_to_solve,0) * content_progress.timed_solve_count
                     + EXCLUDED.average_time_to_solve) / (content_progress.timed_solve_count + 1)
                    ELSE content_progress.average_time_to_solve END,
                timed_solve_count = content_progress.timed_solve_count + EXCLUDED.timed_solve_count,
                updated_at = now()`,
            [randomUUID(), userId, contentId, success ? 1 : 0, success ? now : null, now,
                success ? timeSpent : null, success && timeSpent !== null ? 1 : 0],
        );
        const content = await client.query(
            'SELECT domain, difficulty FROM content_refs WHERE id = $1', [contentId],
        );
        await updateProfileForAttempt(client, userId, {
            questionId: contentId, success, timeSpent, solvedAt: now,
            domain: content.rows[0].domain, difficulty: content.rows[0].difficulty,
            strategy: context.recommendationStrategy || 'general_practice',
        });
        if (success) {
            await client.query(
                `UPDATE recommendation_items i SET
                    completed_at = COALESCE(i.completed_at,$3), success = true,
                    time_spent = COALESCE(i.time_spent,$4)
                 FROM recommendation_batches b
                 WHERE i.batch_id = b.id AND b.user_id = $1
                   AND b.batch_date = ($3::timestamptz AT TIME ZONE 'UTC')::date
                   AND i.content_id = $2`,
                [userId, contentId, now, timeSpent],
            );
        }
        return savedResult;
    });
}

export async function listProgress(userId) {
    const { rows } = await query(
        `SELECT p.*, c.domain, c.group_name, c.difficulty
         FROM content_progress p JOIN content_refs c ON c.id = p.content_id
         WHERE p.user_id = $1 AND p.solve_count > 0 ORDER BY p.last_solved_at DESC, p.content_id`,
        [userId],
    );
    return rows.map(mapProgress);
}

export function mapProgress(row) {
    return {
        _id: row.id,
        userId: row.user_id,
        questionId: row.content_id,
        solveCount: row.solve_count,
        attemptCount: row.attempt_count,
        firstSolvedAt: row.first_solved_at,
        lastUpdatedAt: row.last_solved_at,
        lastAttemptAt: row.last_attempt_at,
        questionGroup: row.group_name,
        questionDifficulty: row.difficulty,
        domain: row.domain,
        averageTimeToSolve: row.average_time_to_solve,
        difficulty_rating: row.difficulty_rating,
        note: row.note,
        tags: row.tags,
    };
}

export async function listHistory(userId, limit = 100, offset = 0, cursor = null) {
    const { rows } = await query(
        `SELECT p.*, c.domain, c.group_name, c.difficulty
         FROM content_progress p JOIN content_refs c ON c.id = p.content_id
         WHERE p.user_id = $1
           ${cursor ? 'AND (p.last_attempt_at < $3::timestamptz OR (p.last_attempt_at = $3::timestamptz AND p.content_id > $4))' : ''}
         ORDER BY p.last_attempt_at DESC, p.content_id LIMIT $2 ${cursor ? '' : 'OFFSET $3'}`,
        cursor ? [userId, limit, cursor.at, cursor.id] : [userId, limit, offset],
    );
    const ids = rows.map(row => row.content_id);
    const events = ids.length ? await query(
        `SELECT recent.* FROM unnest($2::text[]) AS content(id)
         CROSS JOIN LATERAL (
             SELECT a.* FROM attempts a WHERE a.user_id = $1 AND a.content_id = content.id
             ORDER BY a.occurred_at DESC, a.id DESC LIMIT 20
         ) recent`,
        [userId, ids],
    ) : { rows: [] };
    const byContent = new Map();
    for (const event of events.rows) {
        if (!byContent.has(event.content_id)) byContent.set(event.content_id, []);
        byContent.get(event.content_id).push(event);
    }
    return rows.map(row => ({
        ...mapProgress(row),
        solveHistory: (byContent.get(row.content_id) || []).map(event => ({
            _id: event.id, solvedAt: event.occurred_at, success: event.success,
            timeSpent: event.time_spent, sessionContext: event.context,
        })),
    }));
}

export async function updateAnnotations(userId, contentId, { note, tags, difficultyRating }) {
    const { rows } = await query(
        `UPDATE content_progress SET
            note = COALESCE($3,note), tags = COALESCE($4,tags),
            difficulty_rating = COALESCE($5,difficulty_rating)
         WHERE user_id = $1 AND content_id = $2 RETURNING *`,
        [userId, contentId, note ?? null, tags ?? null, difficultyRating ?? null],
    );
    if (!rows[0]) throw new ErrorResponse('No progress exists for this question', 404);
    return mapProgress(rows[0]);
}
