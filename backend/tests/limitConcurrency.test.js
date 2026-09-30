import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { limitConcurrency } from '../utils/limitConcurrency.js';

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
});
