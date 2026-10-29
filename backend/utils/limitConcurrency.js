/**
 * Allow at most `max` calls in flight; the rest wait their turn, first come
 * first served. A finishing call hands its slot straight to the next waiter,
 * so a newcomer can never slip in between and push the count past `max`.
 */
export function limitConcurrency(max, { maxQueue = 32, queueTimeoutMs = 2000 } = {}) {
    if (!Number.isInteger(max) || max < 1 || !Number.isInteger(maxQueue) || maxQueue < 0 ||
        !Number.isFinite(queueTimeoutMs) || queueTimeoutMs <= 0) throw new Error('Invalid concurrency limits');
    let active = 0;
    const waiting = [];
    const unavailable = message => Object.assign(new Error(message), { statusCode: 503, retryAfter: 2 });

    async function run(fn, { signal } = {}) {
        signal?.throwIfAborted();
        if (active < max) active++;
        else {
            if (waiting.length >= maxQueue) throw unavailable('Execution capacity is full; retry shortly');
            await new Promise((resolve, reject) => {
                const entry = { resolve: () => { cleanup(); resolve(); } };
                const remove = error => {
                    const index = waiting.indexOf(entry);
                    if (index >= 0) waiting.splice(index, 1);
                    cleanup();
                    reject(error);
                };
                const aborted = () => remove(signal.reason);
                const timer = setTimeout(() => remove(unavailable('Execution queue wait expired; retry shortly')), queueTimeoutMs);
                const cleanup = () => {
                    clearTimeout(timer);
                    signal?.removeEventListener('abort', aborted);
                };
                waiting.push(entry);
                signal?.addEventListener('abort', aborted, { once: true });
                if (signal?.aborted) aborted();
            });
        }

        try {
            signal?.throwIfAborted();
            return await fn();
        } finally {
            const next = waiting.shift();
            if (next) next.resolve();
            else active--;
        }
    }
    run.stats = () => ({ active, waiting: waiting.length, max, maxQueue });
    return run;
}
