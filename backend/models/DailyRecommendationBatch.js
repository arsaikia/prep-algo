import { v4 as UUID_V4 } from 'uuid';
import {
    readBatch, createBatch, saveBatch, completeVerifiedItem, cleanupExpiredBatches
} from '../repositories/recommendationRepository.js';

const dateFields = new Set([
    'generatedAt', 'expiresAt', 'lastRefreshAt', 'createdAt', 'updatedAt',
    'completedAt', 'clickedAt', 'addedAt', 'originalBatchTime',
    'firstStudied', 'lastStudied', 'lastSolved'
]);

function hydrate(value) {
    if (Array.isArray(value)) return value.map(hydrate);
    if (!value || typeof value !== 'object' || value instanceof Date) return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
        key, dateFields.has(key) && child ? new Date(child) : hydrate(child)
    ]));
}

/** Daily planning domain object; completions live exclusively in item rows. */
export default class DailyRecommendationBatch {
    constructor(data = {}, version) {
        const expiresAt = new Date();
        expiresAt.setUTCDate(expiresAt.getUTCDate() + 1);
        expiresAt.setUTCHours(6, 0, 0, 0);
        Object.assign(this, {
            _id: UUID_V4(), recommendations: [], questionsCompleted: [], analysis: {},
            generatedAt: new Date(), expiresAt, refreshCount: 0, isStale: false,
            batchType: 'daily', createdAt: new Date(), updatedAt: new Date(),
            ...hydrate(data),
            metadata: {
                totalRefreshes: 0, questionsCarriedOver: 0, questionsReplaced: 0,
                ...data.metadata
            }
        });
        Object.defineProperty(this, '_version', { value: version, writable: true });
        Object.defineProperty(this, '_observedCompleted', {
            value: this.questionsCompleted.map(item => item.questionId), writable: true
        });
    }

    static fromRow(row) {
        if (!row) return null;
        const completed = row.items.filter(item => item.completed_at && item.success !== false);
        return new this({
            ...row.data, _id: row.id, userId: row.user_id,
            date: typeof row.batch_date === 'string' ? row.batch_date.slice(0, 10) : row.batch_date.toISOString().slice(0, 10),
            metadata: {
                ...row.data.metadata,
                userSatisfactionScore: row.items.length ? completed.length / row.items.length : 0
            },
            recommendations: row.items.map(item => ({
                domain: 'algorithms', userAction: 'ignored', ...item.data, question: item.content_id
            })),
            questionsCompleted: completed.map(item => ({
                questionId: item.content_id, completedAt: item.completed_at,
                timeSpent: item.time_spent, success: item.success
            }))
        }, row.version);
    }

    header() {
        const analysis = { ...this.analysis };
        if (analysis.dailyActivity) analysis.dailyActivity = analysis.dailyActivity.slice(0, 366);
        if (analysis.strugglingQuestions) analysis.strugglingQuestions = analysis.strugglingQuestions.slice(0, 100);
        return {
            analysis, generatedAt: this.generatedAt, expiresAt: this.expiresAt,
            refreshCount: this.refreshCount, lastRefreshAt: this.lastRefreshAt,
            isStale: this.isStale, batchType: this.batchType, metadata: this.metadata,
            createdAt: this.createdAt, updatedAt: new Date()
        };
    }

    async save() {
        const fresh = this.constructor.fromRow(await saveBatch(this, this.header()));
        Object.assign(this, fresh);
        this._version = fresh._version;
        this._observedCompleted = fresh._observedCompleted;
        return this;
    }

    async markQuestionCompleted(questionId) {
        if (!this.recommendations.some(rec => String(rec.question?._id ?? rec.question) === String(questionId))) return this;
        const fresh = this.constructor.fromRow(await completeVerifiedItem(this, questionId));
        Object.assign(this, fresh);
        this._version = fresh._version;
        this._observedCompleted = fresh._observedCompleted;
        return this;
    }

    getProgress() {
        const ids = new Set(this.recommendations.map(rec => String(rec.question?._id ?? rec.question)));
        const completed = new Set(this.questionsCompleted.filter(q => ids.has(String(q.questionId))).map(q => q.questionId)).size;
        const total = ids.size;
        return {
            total, completed, remaining: Math.max(0, total - completed),
            percentage: total ? Math.round(completed / total * 100) : 0,
            isComplete: completed >= total
        };
    }

    shouldRefresh() {
        const now = new Date();
        const progress = this.getProgress();
        const isDifferentDay = this.generatedAt.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
        const conditions = {
            nextDayWithProgress: isDifferentDay && progress.completed > 0,
            allCompleted: progress.isComplete,
            isStale: this.isStale,
            recentRefresh: this.lastRefreshAt ? now - this.lastRefreshAt < 3600000 : false,
            questionsCompleted: progress.completed >= 2,
            timeThreshold: now - this.generatedAt > 6 * 3600000
        };
        return {
            allowed: (conditions.nextDayWithProgress || conditions.allCompleted || conditions.isStale) && !conditions.recentRefresh,
            reasons: conditions, strategy: isDifferentDay ? 'next_day_refresh' : 'same_day_stable',
            nextRefreshAvailable: conditions.recentRefresh ? new Date(this.lastRefreshAt.getTime() + 3600000) : now,
            canReplaceCompleted: progress.completed > 0
        };
    }

    static async findTodaysBatch(userId) {
        return this.fromRow(await readBatch(userId, new Date().toISOString().slice(0, 10)));
    }

    static async createDailyBatch(userId, recommendations, analysis) {
        const now = new Date();
        const batch = new this({
            userId, date: now.toISOString().slice(0, 10), analysis,
            recommendations: recommendations.map(rec => ({
                ...rec, addedAt: now,
                adaptiveContext: { ...rec.adaptiveContext, isCarriedOver: false, originalBatchTime: now }
            }))
        });
        return this.fromRow(await createBatch(batch, batch.header()));
    }

    static cleanupExpiredBatches() {
        return cleanupExpiredBatches();
    }
}
