import { spawnSync } from 'child_process';

import logger from '../../config/logger.js';
import { limitConcurrency } from '../limitConcurrency.js';

import { POLICY } from './policy.js';
import { buildGuardPrologue } from './pythonGuard.js';
import { dockerRunner, subprocessRunner } from './runners.js';

let dockerProbe = null;
let runSlot = null;

/** Built on first use: server.js loads .env only after its imports evaluate. */
const withSlot = (fn) => {
    runSlot ??= limitConcurrency(POLICY.maxConcurrent);
    return runSlot(fn);
};

/** Probed once per process: the daemon's availability does not change often. */
const dockerAvailable = () => {
    if (dockerProbe !== null) return dockerProbe;
    try {
        const probe = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
            stdio: 'ignore',
            timeout: 3000,
        });
        dockerProbe = probe.status === 0;
    } catch {
        dockerProbe = false;
    }
    return dockerProbe;
};

const selectRunner = () => {
    if (POLICY.mode === 'docker') return dockerRunner;
    if (POLICY.mode === 'subprocess') return subprocessRunner;

    if (dockerAvailable()) return dockerRunner;

    // Worth shouting about: in production this is the difference between an
    // isolation boundary and defence in depth.
    logger.warn(
        { mode: 'subprocess', env: process.env.NODE_ENV },
        'Code sandbox falling back to subprocess mode: Docker daemon unavailable. '
        + 'Untrusted code runs with in-process hardening only.',
    );
    return subprocessRunner;
};

/**
 * Execute untrusted Python under the strongest isolation this host supports.
 *
 * @param {object} options
 * @param {string} options.source    Program text. Sent on stdin; never written to disk.
 * @param {number} [options.timeoutMs]
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number|null,
 *   timedOut: boolean, oom: boolean, truncated: boolean, runner: string}>}
 */
export const executePython = async ({ source, timeoutMs = POLICY.timeoutMs }) => {
    const runner = selectRunner();
    const queuedAt = Date.now();
    let started = queuedAt;

    // The runner starts its own clock, so time spent queued here does not
    // count against the program's timeout.
    const result = await withSlot(() => {
        started = Date.now();
        return runner(buildGuardPrologue() + source, timeoutMs);
    });

    if (result.error) {
        logger.error(
            { runner: result.runner, err: result.error.message },
            'Code sandbox failed to start',
        );
    }

    logger.debug(
        {
            runner: result.runner,
            queuedMs: started - queuedAt,
            durationMs: Date.now() - started,
            exitCode: result.exitCode,
            timedOut: result.timedOut,
            oom: result.oom,
        },
        'Code sandbox execution finished',
    );

    return result;
};

export { POLICY };
