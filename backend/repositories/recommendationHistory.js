import { query } from '../config/postgres.js';

export async function getSolvedHistory(userId) {
    const { rows } = await query(
        `SELECT p.*, c.domain, c.group_name, c.difficulty
         FROM content_progress p JOIN content_refs c ON c.id = p.content_id
         WHERE p.user_id = $1 AND p.solve_count > 0
         ORDER BY p.content_id`,
        [userId]
    );
    return rows.map(row => ({
        questionId: row.content_id,
        questionGroup: row.group_name,
        questionDifficulty: row.difficulty,
        domain: row.domain,
        solveCount: row.solve_count,
        attemptCount: row.attempt_count,
        firstSolvedAt: row.first_solved_at,
        lastUpdatedAt: row.last_solved_at,
        averageTimeToSolve: row.average_time_to_solve
    }));
}

export async function getDailyActivity(userId) {
    const { rows } = await query(
        `SELECT (a.occurred_at AT TIME ZONE 'UTC')::date::text AS day,
                c.group_name, c.difficulty, count(DISTINCT a.content_id)::int AS count
         FROM attempts a JOIN content_refs c ON c.id = a.content_id
         WHERE a.user_id = $1 AND a.success AND a.occurred_at <= now()
         GROUP BY day, c.group_name, c.difficulty ORDER BY day`, [userId]
    );
    const activity = {};
    for (const row of rows) {
        const day = activity[row.day] ||= {
            date: row.day, questionsCompleted: 0, topics: [],
            difficulties: { Easy: 0, Medium: 0, Hard: 0 },
        };
        day.questionsCompleted += row.count;
        if (row.group_name && !day.topics.includes(row.group_name)) day.topics.push(row.group_name);
        if (row.difficulty in day.difficulties) day.difficulties[row.difficulty] += row.count;
    }
    return activity;
}
