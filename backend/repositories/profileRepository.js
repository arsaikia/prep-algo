import { query } from '../config/postgres.js';

export async function findProfile(userId, client) {
    const executor = client || { query };
    const { rows } = await executor.query(
        `SELECT user_id, data, version FROM user_profiles WHERE user_id = $1${client ? ' FOR UPDATE' : ''}`,
        [userId]
    );
    return rows[0] || null;
}

export async function saveProfile(userId, data, version, client) {
    const executor = client || { query };
    const result = version === undefined
        ? await executor.query(
            `INSERT INTO user_profiles (user_id, data, version) VALUES ($1, $2::jsonb, 0)
             ON CONFLICT (user_id) DO NOTHING RETURNING version`,
            [userId, JSON.stringify(data)]
        )
        : await executor.query(
            `UPDATE user_profiles SET data = $2::jsonb, version = version + 1
             WHERE user_id = $1 AND version = $3 RETURNING version`,
            [userId, JSON.stringify(data), version]
        );
    if (!result.rows.length) {
        const error = new Error('Profile changed concurrently; reload and retry');
        error.statusCode = 409;
        throw error;
    }
    return result.rows[0].version;
}
