/**
 * Program text for grading one JavaScript test case.
 *
 * A JavaScript test is a scenario: the body of an async function that drives
 * the learner's function and returns a JSON value, which the server compares
 * with the recorded answer exactly as it does for Python. Scenarios receive
 *
 *   <entry>  the learner's function, under the starter template's name
 *   clock    deterministic time: `await clock.tick(ms)`, `clock.now()`,
 *            `await clock.flush()`, `await clock.state(promise)`
 *   spy(impl?)  a recording function: `.calls` holds `{ args, at }`, `.count`
 *
 * The learner's code runs in a fresh `vm` realm that looks like a browser
 * global scope: no `require`, `process` or real timers. `setTimeout`,
 * `setInterval`, `Date` and `performance.now` all read the fake clock, so
 * debounce and throttle are tested in virtual milliseconds with no flakiness.
 * The realm is a convenience, not the isolation boundary: that is the
 * sandbox process (`node --permission` in a locked-down container).
 */

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** Evaluated inside the learner's realm, so every object it makes belongs there. */
const REALM_BOOTSTRAP = `(log, uncaught) => {
    let now = 0;
    let order = 0;
    let ids = 0;
    const timers = new Map();
    const schedule = (callback, delay, args, repeat) => {
        if (typeof callback !== 'function') throw new TypeError('The "callback" argument must be a function');
        const ms = Math.max(0, Number(delay) || 0);
        const id = ++ids;
        timers.set(id, { callback, args, at: now + ms, order: ++order, every: repeat ? Math.max(1, ms) : 0 });
        return id;
    };
    const cancel = (id) => { timers.delete(id); };
    globalThis.setTimeout = (callback, delay, ...args) => schedule(callback, delay, args, false);
    globalThis.setInterval = (callback, delay, ...args) => schedule(callback, delay, args, true);
    globalThis.clearTimeout = cancel;
    globalThis.clearInterval = cancel;
    globalThis.queueMicrotask = (callback) => { Promise.resolve().then(callback); };

    const RealDate = Date;
    globalThis.Date = new Proxy(RealDate, {
        construct: (target, args, newTarget) => Reflect.construct(target, args.length ? args : [now], newTarget),
        apply: () => new RealDate(now).toString(),
        get: (target, key) => (key === 'now' ? () => now : Reflect.get(target, key)),
    });
    Object.defineProperty(RealDate.prototype, 'constructor', { value: globalThis.Date, writable: true, configurable: true });
    globalThis.performance = { now: () => now };

    const show = (value) => {
        if (typeof value === 'string') return value;
        try { return JSON.stringify(value) ?? String(value); } catch { return String(value); }
    };
    const write = (...args) => log(args.map(show).join(' '));
    globalThis.console = { log: write, info: write, warn: write, error: write, debug: write };

    globalThis.spy = (impl) => {
        const calls = [];
        const fn = function (...args) {
            calls.push({ args, at: now });
            return impl ? impl.apply(this, args) : undefined;
        };
        Object.defineProperty(fn, 'calls', { get: () => calls });
        Object.defineProperty(fn, 'count', { get: () => calls.length });
        return fn;
    };

    return {
        now: () => now,
        setNow: (value) => { now = value; },
        /** Runs the earliest timer due by \`limit\`; false when none is. */
        next: (limit) => {
            let due = null;
            for (const [id, timer] of timers) {
                if (timer.at > limit) continue;
                if (!due || timer.at < due[1].at || (timer.at === due[1].at && timer.order < due[1].order)) due = [id, timer];
            }
            if (!due) return false;
            const [id, timer] = due;
            now = timer.at;
            if (timer.every) {
                timer.at += timer.every;
                timer.order = ++order;
            } else {
                timers.delete(id);
            }
            // As in a browser, a throwing callback is reported and the clock moves on.
            try { timer.callback(...timer.args); } catch (error) { uncaught(error); }
            return true;
        },
    };
}`;

/**
 * @param {object} options
 * @param {string} options.code      the learner's submission
 * @param {string} options.scenario  async function body returning the graded value
 * @param {string} options.entry     function name from the starter template
 * @param {string} options.marker    nonce prefix of the single result line
 */
export const buildJavaScriptProgram = ({ code, scenario, entry, marker }) => {
    if (!IDENTIFIER.test(entry ?? '')) throw new Error('JavaScript problem has no entry function in its starter template');
    return `'use strict';
const vm = require('node:vm');
const write = process.stdout.write.bind(process.stdout);
const stringify = JSON.stringify;
const setImmediateReal = setImmediate;
const MARKER = ${JSON.stringify(marker)};
const ENTRY = ${JSON.stringify(entry)};
const RESULT_LIMIT = 200000;
const MAX_TIMERS_PER_TICK = 100000;

const logs = [];
let logBytes = 0;
const log = (line) => {
    if (logBytes > 20000) return;
    logs.push(line + '\\n');
    logBytes += line.length + 1;
};
const describe = (error) => {
    try {
        if (error && typeof error === 'object' && 'message' in error) return (error.name || 'Error') + ': ' + error.message;
        return 'Uncaught ' + String(error);
    } catch {
        return 'Uncaught exception';
    }
};

let reported = false;
const report = (payload) => {
    if (reported) return;
    reported = true;
    payload.debugOutput = logs.join('').slice(0, 20000);
    write(MARKER + stringify(payload) + '\\n');
};
// A browser only logs these; a rejection the learner never handled is not a crash.
process.on('unhandledRejection', () => {});
process.on('beforeExit', () => report({ error: 'Error: the test is still waiting on a promise that never settled' }));

const flush = () => new Promise((resolve) => setImmediateReal(resolve));

(async () => {
    const context = vm.createContext({}, { name: 'solution', codeGeneration: { strings: true, wasm: false } });
    const clock = vm.runInContext(${JSON.stringify(REALM_BOOTSTRAP)}, context)(log, (error) => log('Uncaught ' + describe(error)));
    vm.runInContext('globalThis.module = { exports: {} }; globalThis.exports = module.exports;', context);

    let fn;
    try {
        fn = new vm.Script(${JSON.stringify(code)} + '\\n;(typeof ' + ENTRY + ' === "function" ? ' + ENTRY + ' : undefined)', {
            filename: 'solution.js',
        }).runInContext(context, { timeout: 2000 });
    } catch (error) {
        return report({ error: describe(error) });
    }
    if (typeof fn !== 'function') {
        const exported = vm.runInContext('module.exports', context);
        fn = typeof exported === 'function' ? exported : exported?.[ENTRY];
    }
    if (typeof fn !== 'function') {
        return report({ error: 'ReferenceError: solution has no function ' + ENTRY + '. Keep the function name from the starter code.' });
    }

    const api = {
        now: () => clock.now(),
        flush,
        async tick(ms) {
            const target = clock.now() + Math.max(0, Number(ms) || 0);
            await flush();
            for (let fired = 0; clock.next(target); fired++) {
                if (fired >= MAX_TIMERS_PER_TICK) throw new Error('more than ' + MAX_TIMERS_PER_TICK + ' timers fired in one tick');
                await flush();
            }
            clock.setNow(target);
            await flush();
        },
        async state(promise) {
            let state = 'pending';
            Promise.resolve(promise).then(() => { state = 'fulfilled'; }, () => { state = 'rejected'; });
            await flush();
            return state;
        },
    };

    try {
        const scenario = vm.runInContext('(async (' + ENTRY + ', clock) => {\\n' + ${JSON.stringify(scenario)} + '\\n})', context, {
            filename: 'test.js',
        });
        const value = await scenario(fn, api);
        const json = stringify(value === undefined ? null : value);
        if (json.length > RESULT_LIMIT) return report({ error: 'Error: result is larger than ' + RESULT_LIMIT + ' characters' });
        report({ result: JSON.parse(json) });
    } catch (error) {
        report({ error: describe(error) });
    }
})();
`;
};
