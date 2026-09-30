/**
 * Allow at most `max` calls in flight; the rest wait their turn, first come
 * first served. A finishing call hands its slot straight to the next waiter,
 * so a newcomer can never slip in between and push the count past `max`.
 */
export function limitConcurrency(max) {
    let active = 0;
    const waiting = [];

    return async function run(fn) {
        if (active < max) active++;
        else await new Promise(resolve => waiting.push(resolve));

        try {
            return await fn();
        } finally {
            const next = waiting.shift();
            if (next) next();
            else active--;
        }
    };
}
