import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import { createTestDatabase, postgresTestSkipReason } from './helpers/postgres.js';
import { withTransaction } from '../config/postgres.js';
import UserProfile, { updateProfileForAttempt } from '../models/UserProfile.js';
import DailyRecommendationBatch from '../models/DailyRecommendationBatch.js';
import { getSolvedHistory } from '../repositories/recommendationHistory.js';
import { getSmartDailyRecommendations, markQuestionCompleted, forceRefreshRecommendations } from '../controller/smartRecommendations.js';
import { calculateCurrentStreak } from '../utils/learningDays.js';
import { recordAttempt } from '../repositories/progress.js';
import { listItems } from '../utils/contentStore.js';

const recommendation = question => ({
    question, reason: 'Quality practice question', priority: 'medium',
    strategy: 'general_practice', domain: 'algorithms'
});

function invoke(handler, req) {
    return new Promise((resolve, reject) => {
        const res = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            json(body) { resolve({ status: this.statusCode, body }); }
        };
        handler(req, res, reject);
    });
}

describe('PostgreSQL recommendation and profile persistence', {
    skip: postgresTestSkipReason()
}, () => {
    let db;
    before(async () => {
        db = await createTestDatabase();
        await db.query(
            `INSERT INTO content_refs (id, slug, domain, type, group_name, difficulty)
             VALUES ('rec-a', 'test-rec-a', 'algorithms', 'problem', 'Arrays', 'Easy'),
                    ('rec-b', 'test-rec-b', 'algorithms', 'problem', 'Arrays', 'Medium'),
                    ('rec-c', 'test-rec-c', 'frontend', 'quiz', 'CSS', 'Easy')`
        );
    });
    after(async () => { if (db) await db.close(); });

    async function user() {
        const id = randomUUID();
        await db.query('INSERT INTO users (id, google_id, email) VALUES ($1, $1, $2)', [id, `${id}@example.test`]);
        return id;
    }

    async function progress(userId, contentId, { solved = 1, at = new Date(), time = 15 } = {}) {
        await db.query(
            `INSERT INTO content_progress
                (id, user_id, content_id, solve_count, attempt_count, first_solved_at,
                 last_solved_at, last_attempt_at, average_time_to_solve)
             VALUES ($1, $2, $3, $4, 1, $5, $5, $6, $7)
             ON CONFLICT (user_id, content_id) DO UPDATE SET
                solve_count = EXCLUDED.solve_count, last_solved_at = EXCLUDED.last_solved_at,
                last_attempt_at = EXCLUDED.last_attempt_at,
                average_time_to_solve = EXCLUDED.average_time_to_solve`,
            [randomUUID(), userId, contentId, solved, solved ? at : null, at, time]
        );
    }

    test('persists defaults and rehydrates imported profile dates without Mongoose', async () => {
        const id = await user();
        const date = '2026-01-03T10:00:00.000Z';
        await db.query(
            `INSERT INTO user_profiles (user_id, data) VALUES ($1, $2::jsonb)`,
            [id, JSON.stringify({
                userId: 'stale-import-id',
                recentPerformance: { last10Questions: [{ questionId: 'rec-a', solvedAt: date }] },
                adaptiveWeights: { adjustmentHistory: [{ date, previousWeights: {} }] },
                adaptationMetadata: { lastWeightAdjustment: date },
                domainPreferences: { algorithms: { lastPracticed: date } }
            })]
        );
        const profile = await UserProfile.findByUserId(id);
        assert.equal(profile.userId, id);
        assert.equal(profile.timePreferences.morningPerformance.averageSuccessRate, 0.5);
        assert.equal(profile.domainPreferences.algorithms.weight, 0.6);
        assert.ok(profile.adaptationMetadata.lastWeightAdjustment instanceof Date);
        assert.ok(profile.recentPerformance.last10Questions[0].solvedAt instanceof Date);
        assert.ok(profile.adaptiveWeights.adjustmentHistory[0].date instanceof Date);
        assert.ok(profile.domainPreferences.algorithms.lastPracticed instanceof Date);
        await profile.save();
        const reread = await UserProfile.findByUserId(id);
        assert.equal(reread.adaptationMetadata.lastWeightAdjustment.toISOString(), date);
        assert.equal(reread.getAdaptiveWeights().weak_area_reinforcement, 0.4);
    });

    test('bounds all adaptive histories and prevents stale profile overwrites', async () => {
        const id = await user();
        const profile = new UserProfile({ userId: id });
        for (let i = 0; i < 80; i++) {
            profile.adaptiveWeights.adjustmentHistory.push({ reason: 'good_performance' });
            profile.learningVelocity.weeklyHistory.push({ weekStartDate: new Date(), questionsCompleted: i });
            profile.updateRecentPerformance({ questionId: 'rec-a', success: i % 2 === 0, domain: 'frontend' });
        }
        await profile.save();
        const first = await UserProfile.findByUserId(id);
        const stale = await UserProfile.findByUserId(id);
        assert.equal(first.adaptiveWeights.adjustmentHistory.length, 52);
        assert.equal(first.learningVelocity.weeklyHistory.length, 52);
        assert.equal(first.recentPerformance.last10Questions.length, 10);
        assert.equal(first.recentPerformance.last10Questions[0].domain, 'frontend');
        first.computedMetrics.readyForAdvancement = true;
        await first.save();
        await assert.rejects(stale.save(), error => error.statusCode === 409);
        assert.equal((await UserProfile.findByUserId(id)).computedMetrics.readyForAdvancement, true);
    });

    test('records failed and successful profile outcomes inside the caller transaction', async () => {
        const id = await user();
        await progress(id, 'rec-a', { solved: 0 });
        await withTransaction(async client => {
            await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [id]);
            await updateProfileForAttempt(client, id, {
                questionId: 'rec-a', success: false, timeSpent: 0,
                difficulty: 'Easy', domain: 'algorithms', solvedAt: new Date()
            });
        });
        let profile = await UserProfile.findByUserId(id);
        assert.equal(profile.recentPerformance.recentSuccessRate, 0);
        assert.equal(profile.recentPerformance.currentStreak.type, 'failure');
        assert.equal(profile.domainPreferences.algorithms.questionsCompleted, 0);
        await assert.rejects(withTransaction(async client => {
            await updateProfileForAttempt(client, id, {
                questionId: 'rec-a', success: true, timeSpent: 20, domain: 'algorithms'
            });
            throw new Error('rollback-test');
        }), /rollback-test/);
        assert.equal((await UserProfile.findByUserId(id)).recentPerformance.last10Questions.length, 1);
        await progress(id, 'rec-a');
        await withTransaction(client => updateProfileForAttempt(client, id, {
            questionId: 'rec-a', success: true, timeSpent: 10, difficulty: 'Easy', domain: 'algorithms'
        }));
        profile = await UserProfile.findByUserId(id);
        assert.equal(profile.recentPerformance.recentSuccessRate, 0.5);
        assert.equal(profile.recentPerformance.currentStreak.count, 1);
        assert.equal(profile.domainPreferences.algorithms.questionsCompleted, 1);
        assert.equal(profile.learningVelocity.questionsPerWeek, 1);
    });

    test('creates normalized durable items and returns the winning concurrent daily batch', async () => {
        const id = await user();
        const [first, second] = await Promise.all([
            DailyRecommendationBatch.createDailyBatch(id, [recommendation({ _id: 'rec-a', title: 'public' })], { totalSolved: 0 }),
            DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-b')], { totalSolved: 0 })
        ]);
        assert.equal(first._id, second._id);
        const { rows: [header] } = await db.query('SELECT data FROM recommendation_batches WHERE id = $1', [first._id]);
        assert.equal(header.data.recommendations, undefined);
        assert.equal(header.data.questionsCompleted, undefined);
        const { rows: items } = await db.query('SELECT * FROM recommendation_items WHERE batch_id = $1', [first._id]);
        assert.equal(items.length, 1);
        assert.equal(typeof items[0].data.question, 'string');
        assert.equal((await DailyRecommendationBatch.findTodaysBatch(id)).recommendations[0].question, items[0].content_id);
    });

    test('concurrent first daily loads converge and event-based activity survives re-solves', async () => {
        const id = await user();
        const request = () => invoke(getSmartDailyRecommendations, { params: { userId: id }, query: {} });
        const results = await Promise.all([request(), request(), request()]);
        assert.ok(results.every(result => result.status === 200));
        assert.equal(new Set(results.map(result => result.body.data.batchInfo.generatedAt.toISOString())).size, 1);
        for (const success of [false, false, true]) {
            await recordAttempt({
                userId: id, contentId: 'rec-a', submissionKey: randomUUID(),
                requestHash: 'test', success, result: {}, timeSpent: 20,
            });
        }
        await db.query(
            `UPDATE attempts SET occurred_at = $2 WHERE user_id = $1 AND success`,
            [id, '2026-03-07T23:59:00Z']
        );
        await recordAttempt({
            userId: id, contentId: 'rec-a', submissionKey: randomUUID(),
            requestHash: 'test', success: true, result: {}, timeSpent: 40,
        });
        const response = await request();
        assert.equal(response.body.data.analysis.topicMastery.find(row => row.topic === 'Arrays').averageAttempts, 4);
        assert.ok(response.body.data.analysis.dailyActivity.some(day => day.date === '2026-03-07'));
        const history = await getSolvedHistory(id);
        assert.equal(history[0].averageTimeToSolve, 30);
        const days = { '2026-03-07': { questionsCompleted: 1 }, '2026-03-08': { questionsCompleted: 1 } };
        assert.equal(calculateCurrentStreak(days, new Date('2026-03-09T00:01:00Z')).currentStreak, 2);
        assert.equal(calculateCurrentStreak(days, new Date('2026-03-10T00:01:00Z')).currentStreak, 0);
    });

    test('rejects fabricated completion and old solves; uses only authoritative current solve data', async () => {
        const id = await user();
        await progress(id, 'rec-a', { at: new Date(Date.now() - 86400000) });
        const batch = await DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-a'), recommendation('rec-b')], {});
        await assert.rejects(batch.markQuestionCompleted('rec-a', { success: true }), error => error.statusCode === 400);
        await progress(id, 'rec-b', { solved: 0 });
        await assert.rejects(batch.markQuestionCompleted('rec-b', { success: true }), error => error.statusCode === 400);
        assert.equal(batch.getProgress().completed, 0);
        await progress(id, 'rec-a', { at: new Date(Date.now() + 1000), time: 0 });
        await batch.markQuestionCompleted('rec-a', { timeSpent: 9999, success: false });
        await batch.markQuestionCompleted('rec-a');
        assert.equal(batch.getProgress().completed, 1);
        assert.equal(batch.questionsCompleted[0].timeSpent, 0);
        assert.equal(batch.questionsCompleted[0].success, true);
        assert.equal(batch.metadata.userSatisfactionScore, 0.5);
    });

    test('retains a concurrent server completion when updating item actions', async () => {
        const id = await user();
        const batch = await DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-a')], {});
        await db.query(
            `UPDATE recommendation_items SET completed_at = now(), time_spent = 21, success = true
             WHERE batch_id = $1 AND content_id = 'rec-a'`, [batch._id]
        );
        batch.recommendations[0].userAction = 'attempted';
        await batch.save();
        assert.equal(batch.getProgress().completed, 1);
        assert.equal(batch.questionsCompleted[0].timeSpent, 21);
        assert.equal(batch.recommendations[0].userAction, 'attempted');
        assert.equal((await DailyRecommendationBatch.findTodaysBatch(id)).getProgress().completed, 1);
    });

    test('a refresh cannot delete a completion that arrived after its snapshot', async () => {
        const id = await user();
        const batch = await DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-a')], {});
        await db.query(
            `UPDATE recommendation_items SET completed_at = now(), success = true
             WHERE batch_id = $1`, [batch._id]
        );
        batch.recommendations = [recommendation('rec-b')];
        await assert.rejects(batch.save(), error => error.statusCode === 409);
        const current = await DailyRecommendationBatch.findTodaysBatch(id);
        assert.equal(current.recommendations[0].question, 'rec-a');
        assert.equal(current.getProgress().completed, 1);
        assert.equal(current._version, 0, 'conflicting header update rolls back');
    });

    test('selective replacement counts only the current items, not removed completions', async () => {
        const id = await user();
        const batch = await DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-a')], {});
        await progress(id, 'rec-a', { at: new Date(Date.now() + 1000) });
        await batch.markQuestionCompleted('rec-a');
        batch.recommendations = [recommendation('rec-b')];
        batch.batchType = 'selective_refresh';
        await batch.save();
        assert.deepEqual(batch.getProgress(), { total: 1, completed: 0, remaining: 1, percentage: 0, isComplete: false });
        assert.equal(batch.questionsCompleted.length, 0);
        assert.equal(batch.shouldRefresh().canReplaceCompleted, false);
    });

    test('optimistic batch version prevents competing refreshes from overwriting each other', async () => {
        const id = await user();
        await DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-a')], {});
        const first = await DailyRecommendationBatch.findTodaysBatch(id);
        const second = await DailyRecommendationBatch.findTodaysBatch(id);
        first.refreshCount++;
        second.refreshCount++;
        const results = await Promise.allSettled([first.save(), second.save()]);
        assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
        assert.equal(results.find(result => result.status === 'rejected').reason.statusCode, 409);
        assert.equal((await DailyRecommendationBatch.findTodaysBatch(id)).refreshCount, 1);
    });

    test('filters expired headers without Mongo TTL and safely replaces an expired same-date batch', async () => {
        const id = await user();
        const expired = await DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-a')], {});
        await db.query(
            `UPDATE recommendation_batches SET data = jsonb_set(data, '{expiresAt}', to_jsonb($2::text))
             WHERE id = $1`, [expired._id, new Date(Date.now() - 1000).toISOString()]
        );
        assert.equal(await DailyRecommendationBatch.findTodaysBatch(id), null);
        const replacement = await DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-b')], {});
        assert.notEqual(replacement._id, expired._id);
        assert.equal((await db.query('SELECT * FROM recommendation_items WHERE batch_id = $1', [expired._id])).rows.length, 0);
        assert.equal((await DailyRecommendationBatch.findTodaysBatch(id)).recommendations[0].question, 'rec-b');
    });

    test('hydrates imported batch dates, analysis dates and recommendation metadata', async () => {
        const id = await user();
        const batch = await DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-a')], {});
        const date = new Date(Date.now() - 1000).toISOString();
        await db.query(
            `UPDATE recommendation_batches SET data = data || $2::jsonb WHERE id = $1`,
            [batch._id, JSON.stringify({
                lastRefreshAt: date,
                analysis: { topicMastery: [{ topic: 'Arrays', firstStudied: date, lastStudied: date }] }
            })]
        );
        const hydrated = await DailyRecommendationBatch.findTodaysBatch(id);
        assert.ok(hydrated.generatedAt instanceof Date);
        assert.ok(hydrated.expiresAt instanceof Date);
        assert.ok(hydrated.lastRefreshAt instanceof Date);
        assert.ok(hydrated.recommendations[0].addedAt instanceof Date);
        assert.ok(hydrated.recommendations[0].adaptiveContext.originalBatchTime instanceof Date);
        assert.ok(hydrated.analysis.topicMastery[0].firstStudied instanceof Date);
        assert.equal(hydrated.shouldRefresh().reasons.recentRefresh, true);
    });

    test('excludes failed-only progress from solved history and preserves public HTTP response shape', async () => {
        const id = await user();
        const candidates = listItems().filter(item => item.legacyId && item.domain === 'algorithms' &&
            ['problem', 'quiz'].includes(item.type) && item.group && item.difficulty);
        assert.ok(candidates.length >= 2, 'built content catalog is available');
        await progress(id, candidates[0].legacyId);
        await progress(id, candidates[1].legacyId, { solved: 0 });
        const history = await getSolvedHistory(id);
        assert.equal(history.length, 1);
        assert.equal(history[0].questionId, candidates[0].legacyId);
        assert.ok(history[0].lastUpdatedAt instanceof Date);
        const { status, body } = await invoke(getSmartDailyRecommendations, {
            params: { userId: id }, query: { count: '5' }
        });
        assert.equal(status, 200);
        assert.equal(body.success, true);
        assert.equal(body.data.totalSolved, 1);
        assert.equal(body.data.analysis.totalSolved, 1);
        assert.ok(Array.isArray(body.data.analysis.topicMastery));
        assert.ok(body.data.batchInfo.generatedAt instanceof Date);
        assert.equal(body.data.progress.completed, 0);
        assert.ok(body.data.recommendations.length > 0);
        for (const rec of body.data.recommendations) {
            assert.ok(rec.question?._id);
            assert.equal(rec.question.testCases, undefined);
            assert.equal(rec.question.answer, undefined);
            assert.equal(rec.completed, false);
            assert.equal(rec.lastSolved, null);
        }
        const questionId = body.data.recommendations[0].question._id;
        await assert.rejects(invoke(markQuestionCompleted, {
            params: { userId: id }, body: { questionId, success: true, timeSpent: 1 }
        }), error => error.statusCode === 400);
    });

    test('HTTP error middleware preserves unverified-completion 400 and concurrent-refresh 409', async t => {
        const id = await user();
        const batch = await DailyRecommendationBatch.createDailyBatch(id, [recommendation('rec-a')], {});
        const app = express();
        app.use(express.json());
        app.post('/:userId/complete', markQuestionCompleted);
        app.get('/:userId/daily', getSmartDailyRecommendations);
        app.post('/:userId/refresh', forceRefreshRecommendations);
        // Mirrors the status/message mapping of the global handler in server.js.
        app.use((err, req, res, next) => {
            res.status(err.statusCode || err.status || 500).json({ success: false, error: err.message });
        });
        const server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const base = `http://127.0.0.1:${server.address().port}/${id}`;
        try {
            const rejected = await fetch(`${base}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId: 'rec-a', success: true, timeSpent: 1 })
            });
            assert.equal(rejected.status, 400);
            assert.deepEqual(await rejected.json(), {
                success: false,
                error: 'Question must be solved on the server before completing the recommendation'
            });

            const save = DailyRecommendationBatch.prototype.save;
            t.mock.method(DailyRecommendationBatch.prototype, 'save', async function () {
                // Simulate another request committing between refresh planning and save.
                await db.query(
                    'UPDATE recommendation_batches SET version = version + 1 WHERE id = $1',
                    [this._id]
                );
                return save.call(this);
            });
            const rejectedGet = await fetch(`${base}/daily?forceRefresh=true`);
            assert.equal(rejectedGet.status, 400);
            await db.query(`UPDATE recommendation_batches SET data = data || '{"isStale":true}'::jsonb WHERE id = $1`, [batch._id]);
            const conflict = await fetch(`${base}/refresh`, { method: 'POST' });
            assert.equal(conflict.status, 409);
            assert.deepEqual(await conflict.json(), {
                success: false,
                error: 'Recommendations changed concurrently; reload and retry'
            });
            const current = await DailyRecommendationBatch.findTodaysBatch(id);
            assert.equal(current._id, batch._id);
            assert.equal(current.recommendations[0].question, 'rec-a');
            assert.equal(current.getProgress().completed, 0);
        } finally {
            t.mock.restoreAll();
            const closed = new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            server.closeAllConnections();
            await closed;
        }
    });
});
