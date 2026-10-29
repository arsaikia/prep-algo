import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { limitConcurrency } from '../utils/limitConcurrency.js';
import { getExecutionLoad, runSubmission } from '../utils/executionBudget.js';

const tick = () => new Promise(resolve => setImmediate(resolve));

describe('limitConcurrency', () => {
    it('never runs more than max at once and runs every task', async () => {
        const run = limitConcurrency(2);
        let active = 0;
        let peak = 0;

        const task = async (value) => {
            active++;
            peak = Math.max(peak, active);
            await tick();
            await tick();
            active--;
            return value;
        };

        const results = await Promise.all([1, 2, 3, 4, 5, 6, 7].map(n => run(() => task(n))));

        assert.deepEqual(results, [1, 2, 3, 4, 5, 6, 7]);
        assert.equal(peak, 2);
    });

    it('submission admission permits exactly one active and eight waiting requests', async () => {
        let release;
        const active = runSubmission(() => new Promise(resolve => { release = resolve; }));
        const controller = new AbortController();
        const queued = Array.from({ length: 8 }, () => runSubmission(
            () => assert.fail('cancelled submission ran'), { signal: controller.signal },
        ));
        const settled = Promise.allSettled(queued);
        assert.equal(getExecutionLoad().active, 1);
        assert.equal(getExecutionLoad().waiting, 8);
        await assert.rejects(runSubmission(() => {}), error => error.statusCode === 503);
        controller.abort();
        assert.ok((await settled).every(result => result.status === 'rejected'));
        release();
        await active;
        assert.equal(getExecutionLoad().active, 0);
        assert.equal(getExecutionLoad().waiting, 0);
    });

    it('starts queued tasks in arrival order', async () => {
        const run = limitConcurrency(1);
        const order = [];

        await Promise.all(['a', 'b', 'c'].map(id => run(async () => {
            order.push(id);
            await tick();
        })));

        assert.deepEqual(order, ['a', 'b', 'c']);
    });

    it('releases the slot when a task throws', async () => {
        const run = limitConcurrency(1);

        await assert.rejects(run(async () => { throw new Error('boom'); }), /boom/);
        assert.equal(await run(async () => 'next'), 'next');
    });

    it('does not let a newcomer overtake a waiter being handed the slot', async () => {
        const run = limitConcurrency(1);
        let active = 0;
        let peak = 0;
        const task = async () => {
            active++;
            peak = Math.max(peak, active);
            await tick();
            active--;
        };

        const first = run(task);
        const second = run(task);
        await first;
        // Arrives while `second` is being handed the slot but has not started.
        const third = run(task);
        await Promise.all([second, third]);

        assert.equal(peak, 1);
    });

    it('bounds capacity and removes expired and cancelled waiters without leaking slots', async () => {
        const run = limitConcurrency(1, { maxQueue: 1, queueTimeoutMs: 20 });
        let release;
        const first = run(() => new Promise(resolve => { release = resolve; }));
        const expired = run(() => assert.fail('expired waiter ran'));
        await assert.rejects(run(() => {}), error => error.statusCode === 503 && error.retryAfter === 2);
        await assert.rejects(expired, error => error.statusCode === 503);
        const controller = new AbortController();
        const cancelled = run(() => assert.fail('cancelled waiter ran'), { signal: controller.signal });
        controller.abort();
        await assert.rejects(cancelled, error => error.name === 'AbortError');
        release();
        await first;
        assert.equal(await run(() => 'recovered'), 'recovered');
        assert.equal(run.stats().waiting, 0);
        assert.equal(run.stats().active, 0);
    });
});
