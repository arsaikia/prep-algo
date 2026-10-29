import { query, withTransaction } from '../config/postgres.js';

const active = `COALESCE((data->>'expiresAt')::timestamptz,
    batch_date::timestamptz + interval '30 hours') > now()`;

function conflict() {
    const error = new Error('Recommendations changed concurrently; reload and retry');
    error.statusCode = 409;
    return error;
}

export async function readBatch(userId, date, client) {
    const executor = client || { query };
    const { rows } = await executor.query(
        `SELECT * FROM recommendation_batches WHERE user_id = $1 AND batch_date = $2 AND ${active}`,
        [userId, date]
    );
    if (!rows.length) return null;
    const { rows: items } = await executor.query(
        'SELECT * FROM recommendation_items WHERE batch_id = $1 ORDER BY position, content_id',
        [rows[0].id]
    );
    return { ...rows[0], items };
}

async function writeItems(client, batch, existing = []) {
    const prior = new Map(existing.map(item => [item.content_id, item]));
    const observed = new Set((batch._observedCompleted || []).map(String));
    const ids = batch.recommendations.map(rec => String(rec.question?._id ?? rec.question?.id ?? rec.question));
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate recommendation content');
    // A solve that arrived after this refresh was planned must not be deleted.
    for (const item of existing) {
        if (item.completed_at && !observed.has(item.content_id) && !ids.includes(item.content_id)) throw conflict();
    }
    await client.query(
        'DELETE FROM recommendation_items WHERE batch_id = $1 AND NOT (content_id = ANY($2::text[]))',
        [batch._id, ids]
    );
    const items = batch.recommendations.map((recommendation, position) => {
        const contentId = ids[position];
        return { content_id: contentId, position, data: {
            ...recommendation, question: contentId,
            addedAt: prior.get(contentId)?.data?.addedAt || recommendation.addedAt || new Date()
        } };
    });
    await client.query(
        `INSERT INTO recommendation_items (batch_id, content_id, position, data)
         SELECT $1, item.content_id, item.position, item.data
         FROM jsonb_to_recordset($2::jsonb) AS item(content_id text, position integer, data jsonb)
         ON CONFLICT (batch_id, content_id) DO UPDATE
         SET position = EXCLUDED.position, data = EXCLUDED.data`,
        [batch._id, JSON.stringify(items)]
    );
}

export async function createBatch(batch, data) {
    return withTransaction(async client => {
        await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [batch.userId]);
        // Expired same-date headers cannot block a replacement indefinitely.
        await client.query(
            `DELETE FROM recommendation_batches WHERE user_id = $1 AND batch_date = $2 AND NOT (${active})`,
            [batch.userId, batch.date]
        );
        const result = await client.query(
            `INSERT INTO recommendation_batches (id, user_id, batch_date, data, version)
             VALUES ($1, $2, $3, $4::jsonb, 0)
             ON CONFLICT (user_id, batch_date) DO NOTHING RETURNING id`,
            [batch._id, batch.userId, batch.date, JSON.stringify(data)]
        );
        if (result.rows.length) await writeItems(client, batch);
        return readBatch(batch.userId, batch.date, client);
    });
}

export async function saveBatch(batch, data) {
    return withTransaction(async client => {
        await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [batch.userId]);
        const result = await client.query(
            `UPDATE recommendation_batches SET data = $2::jsonb, version = version + 1
             WHERE id = $1 AND version = $3 AND ${active} RETURNING id`,
            [batch._id, JSON.stringify(data), batch._version]
        );
        if (!result.rows.length) throw conflict();
        const { rows: existing } = await client.query(
            'SELECT * FROM recommendation_items WHERE batch_id = $1 ORDER BY content_id FOR UPDATE',
            [batch._id]
        );
        await writeItems(client, batch, existing);
        return readBatch(batch.userId, batch.date, client);
    });
}

export async function completeVerifiedItem(batch, contentId) {
    return withTransaction(async client => {
        await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [batch.userId]);
        // Do not accept completion time, success or duration from the browser.
        const { rows } = await client.query(
            `UPDATE recommendation_items i
             SET completed_at = COALESCE(i.completed_at, p.last_solved_at),
                 time_spent = COALESCE(i.time_spent, p.average_time_to_solve),
                 success = true
             FROM content_progress p, recommendation_batches b
             WHERE i.batch_id = $1 AND i.content_id = $2
               AND b.id = i.batch_id AND b.user_id = $3 AND ${active.replaceAll('data->', 'b.data->').replaceAll('batch_date::', 'b.batch_date::')}
               AND p.user_id = b.user_id AND p.content_id = i.content_id
               AND p.solve_count > 0
               AND p.last_solved_at >= COALESCE((i.data->>'addedAt')::timestamptz,
                   (b.data->>'generatedAt')::timestamptz, b.batch_date::timestamptz)
             RETURNING i.content_id`,
            [batch._id, String(contentId), batch.userId]
        );
        if (!rows.length) {
            const error = new Error('Question must be solved on the server before completing the recommendation');
            error.statusCode = 400;
            throw error;
        }
        return readBatch(batch.userId, batch.date, client);
    });
}

export async function cleanupExpiredBatches() {
    const result = await query(`DELETE FROM recommendation_batches WHERE NOT (${active})`);
    return { deletedCount: result.rowCount };
}
