import { AsyncLocalStorage } from 'node:async_hooks';
import { limitConcurrency } from './limitConcurrency.js';
import logger from '../config/logger.js';

const context = new AsyncLocalStorage();
let admission;
export const getExecutionBudget = () => context.getStore();
export const getExecutionLoad = () => admission?.stats() || { active: 0, waiting: 0 };

export async function runSubmission(fn, { signal } = {}) {
    admission ||= limitConcurrency(1, { maxQueue: 8, queueTimeoutMs: 2000 });
    const started = Date.now();
    const deadline = AbortSignal.timeout(15000);
    const combined = signal ? AbortSignal.any([signal, deadline]) : deadline;
    try {
        return await admission(() => context.run({ signal: combined }, fn), { signal: combined });
    } catch (error) {
        if (deadline.aborted) {
            throw Object.assign(new Error('Submission deadline exceeded'), { statusCode: 504 });
        }
        throw error;
    } finally {
        logger.info({ durationMs: Date.now() - started, ...getExecutionLoad() }, 'submission execution finished');
    }
}

export function requestExecutionSignal(req, res) {
    const controller = new AbortController();
    const abort = () => controller.abort(Object.assign(new Error('Request disconnected'), { statusCode: 499 }));
    req.once('aborted', abort);
    res.once('close', () => {
        if (!res.writableEnded) abort();
        req.removeListener('aborted', abort);
    });
    return controller.signal;
}
