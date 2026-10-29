import { v4 as UUID_V4 } from 'uuid';
import { findProfile, saveProfile } from '../repositories/profileRepository.js';
import { withTransaction } from '../config/postgres.js';

const DEFAULT_WEIGHTS = {
    weak_area_reinforcement: 0.4,
    progressive_difficulty: 0.3,
    spaced_repetition: 0.2,
    topic_exploration: 0.07,
    general_practice: 0.03
};

const dateFields = new Set([
    'createdAt', 'updatedAt', 'weekStartDate', 'date', 'solvedAt', 'startDate',
    'lastSessionDate', 'lastPracticed', 'lastAnalyzed', 'lastWeightAdjustment',
    'lastQualityCheck'
]);

function hydrateDates(value) {
    if (Array.isArray(value)) return value.map(hydrateDates);
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
        key, dateFields.has(key) && child ? new Date(child) : hydrateDates(child)
    ]));
}

function mergeDefaults(defaults, value = {}) {
    const result = { ...defaults, ...value };
    for (const [key, child] of Object.entries(defaults)) {
        if (child && typeof child === 'object' && !Array.isArray(child) && !(child instanceof Date)) {
            result[key] = mergeDefaults(child, value?.[key] || {});
        }
    }
    return result;
}

function defaults() {
    const performance = () => ({ averageSuccessRate: 0.5, averageTimePerQuestion: 15, sessionCount: 0 });
    return {
        _id: UUID_V4(),
        learningVelocity: { questionsPerWeek: 0, lastWeekCount: 0, improvementTrend: 'stable', weeklyHistory: [] },
        timePreferences: {
            morningPerformance: performance(), afternoonPerformance: performance(),
            eveningPerformance: performance(), optimalTimeOfDay: 'morning'
        },
        adaptiveWeights: { ...DEFAULT_WEIGHTS, adjustmentHistory: [] },
        recentPerformance: {
            last10Questions: [], currentStreak: { type: 'success', count: 0 },
            recentSuccessRate: 0.5, performanceTrend: 'stable'
        },
        sessionPatterns: {
            averageSessionLength: 30, questionsPerSession: 3, optimalBatchSize: 3, sessionFrequency: 3
        },
        domainPreferences: {
            algorithms: { weight: 0.6, questionsCompleted: 0 },
            system_design: { weight: 0.2, questionsCompleted: 0 },
            frontend: { weight: 0.2, questionsCompleted: 0 }
        },
        adaptationMetadata: {
            lastAnalyzed: new Date(), adaptationEnabled: true,
            dataQuality: { hasSufficientData: false }, version: '1.0'
        },
        computedMetrics: {
            overallSuccessRate: 0.5, averageTimePerQuestion: 15, weakestTopics: [], readyForAdvancement: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

/** Adaptive learning state with explicit, optimistic PostgreSQL persistence. */
export default class UserProfile {
    constructor(data = {}, version) {
        Object.assign(this, hydrateDates(mergeDefaults(defaults(), data)));
        Object.defineProperty(this, '_version', { value: version, writable: true });
        this.boundHistory();
    }

    boundHistory() {
        this.recentPerformance.last10Questions = this.recentPerformance.last10Questions.slice(-10);
        this.learningVelocity.weeklyHistory = this.learningVelocity.weeklyHistory.slice(-52);
        this.adaptiveWeights.adjustmentHistory = this.adaptiveWeights.adjustmentHistory
            .slice(-52).map(entry => ({ ...entry, date: entry.date ? new Date(entry.date) : new Date() }));
    }

    async save(client) {
        this.updatedAt = new Date();
        this.boundHistory();
        this._version = await saveProfile(this.userId, { ...this }, this._version, client);
        return this;
    }

    updateRecentPerformance(questionResult) {
        const solvedAt = questionResult.solvedAt ? new Date(questionResult.solvedAt) : new Date();
        this.recentPerformance.last10Questions.push({
            questionId: questionResult.questionId,
            success: questionResult.success,
            timeSpent: questionResult.timeSpent,
            difficulty: questionResult.difficulty,
            domain: questionResult.domain || 'algorithms',
            solvedAt,
            strategy: questionResult.strategy
        });
        this.boundHistory();
        const recent = this.recentPerformance.last10Questions;
        this.recentPerformance.recentSuccessRate = recent.filter(q => q.success).length / recent.length;
        const type = questionResult.success ? 'success' : 'failure';
        const streak = this.recentPerformance.currentStreak;
        this.recentPerformance.currentStreak = streak.type === type
            ? { ...streak, count: streak.count + 1, startDate: streak.startDate || solvedAt }
            : { type, count: 1, startDate: solvedAt };
    }

    getAdaptiveWeights() {
        if (!this.adaptationMetadata.dataQuality.hasSufficientData) return { ...DEFAULT_WEIGHTS };
        return Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map(key => [key, this.adaptiveWeights[key]]));
    }

    shouldAdjustWeights() {
        if (!this.adaptationMetadata.dataQuality.hasSufficientData) return false;
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (this.adaptationMetadata.lastWeightAdjustment > oneWeekAgo) return false;
        const successRate = this.recentPerformance.recentSuccessRate;
        return successRate < 0.4 || successRate > 0.8;
    }

    static async findByUserId(userId, client) {
        const row = await findProfile(userId, client);
        return row ? new this({ ...row.data, userId: row.user_id }, row.version) : null;
    }

    static async ensureFromHistory(userId, history) {
        return withTransaction(async client => {
            await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
            const existing = await this.findByUserId(userId, client);
            if (existing) return existing;
            const profile = await this.createFromSolveHistory(userId, history);
            await profile.save(client);
            return profile;
        });
    }

    static async createFromSolveHistory(userId, solveHistory) {
        const solved = solveHistory.filter(row => row.solveCount > 0);
        const recent = [...solved].sort((a, b) => new Date(b.lastUpdatedAt) - new Date(a.lastUpdatedAt)).slice(0, 10);
        const attempts = recent.reduce((sum, row) => sum + Math.max(row.attemptCount || row.solveCount, row.solveCount), 0);
        const successRate = attempts ? recent.reduce((sum, row) => sum + row.solveCount, 0) / attempts : 0.5;
        const averageTime = recent.length
            ? recent.reduce((sum, q) => sum + (q.averageTimeToSolve ?? 15), 0) / recent.length : 15;
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentWeek = solved.filter(q => new Date(q.lastUpdatedAt) > oneWeekAgo).length;
        return new this({
            userId,
            learningVelocity: { questionsPerWeek: recentWeek, lastWeekCount: recentWeek },
            recentPerformance: {
                recentSuccessRate: successRate,
                last10Questions: recent.map(q => ({
                    questionId: q.questionId, success: true,
                    timeSpent: q.averageTimeToSolve ?? 15,
                    difficulty: q.questionDifficulty || 'Medium', domain: q.domain || 'algorithms',
                    solvedAt: q.lastUpdatedAt, strategy: 'general_practice'
                }))
            },
            computedMetrics: { overallSuccessRate: successRate, averageTimePerQuestion: averageTime },
            adaptationMetadata: { dataQuality: { hasSufficientData: solved.length >= 20 } }
        });
    }
}

/**
 * Called only from the authoritative attempt transaction. The caller locks the
 * user row first, serializing first-profile creation as well as future attempts.
 */
export async function updateProfileForAttempt(client, userId, result) {
    let profile = await UserProfile.findByUserId(userId, client);
    if (!profile) profile = new UserProfile({ userId });
    profile.updateRecentPerformance(result);
    const at = result.solvedAt ? new Date(result.solvedAt) : new Date();
    const hour = at.getUTCHours();
    const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const performance = profile.timePreferences[`${period}Performance`];
    const count = performance.sessionCount;
    performance.averageSuccessRate = (performance.averageSuccessRate * count + Number(result.success)) / (count + 1);
    if (Number.isFinite(result.timeSpent) && result.timeSpent >= 0) {
        performance.averageTimePerQuestion = (performance.averageTimePerQuestion * count + result.timeSpent) / (count + 1);
    }
    performance.sessionCount++;
    profile.timePreferences.optimalTimeOfDay = ['morning', 'afternoon', 'evening']
        .reduce((best, candidate) => profile.timePreferences[`${candidate}Performance`].averageSuccessRate >
            profile.timePreferences[`${best}Performance`].averageSuccessRate ? candidate : best);
    const { rows: [metrics] } = await client.query(
        `SELECT count(*) FILTER (WHERE solve_count > 0)::int AS solved,
                count(*) FILTER (WHERE solve_count > 0 AND last_solved_at > now() - interval '7 days')::int AS weekly
         FROM content_progress WHERE user_id = $1`, [userId]
    );
    profile.learningVelocity.questionsPerWeek = metrics.weekly;
    profile.adaptationMetadata.dataQuality = {
        hasSufficientData: metrics.solved >= 20, lastQualityCheck: at
    };
    profile.adaptationMetadata.lastAnalyzed = at;
    profile.sessionPatterns.lastSessionDate = at;
    const domain = profile.domainPreferences[result.domain || 'algorithms'];
    if (domain) {
        if (result.success) domain.questionsCompleted++;
        domain.lastPracticed = at;
    }
    profile.computedMetrics.overallSuccessRate = profile.recentPerformance.recentSuccessRate;
    const timed = profile.recentPerformance.last10Questions.filter(q => Number.isFinite(q.timeSpent));
    if (timed.length) {
        profile.computedMetrics.averageTimePerQuestion = timed.reduce((sum, q) => sum + q.timeSpent, 0) / timed.length;
    }
    await profile.save(client);
    return profile;
}
