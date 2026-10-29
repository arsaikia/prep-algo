import { spawnSync } from 'child_process';

import logger from '../../config/logger.js';
import { limitConcurrency } from '../limitConcurrency.js';

import { LANGUAGES, POLICY } from './policy.js';
import { buildGuardPrologue } from './pythonGuard.js';
import { dockerRunner, subprocessRunner } from './runners.js';
import { getExecutionBudget } from '../executionBudget.js';
import { remoteRunner } from './remote.js';

let dockerProbe = null;
let runSlot = null;

/** Built on first use: server.js loads .env only after its imports evaluate. */
const withSlot = (fn, options) => {
    runSlot ??= limitConcurrency(POLICY.maxConcurrent);
    return runSlot(fn, options);
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
    if (process.env.CODE_EXECUTOR_URL) return remoteRunner;
    if (process.env.NODE_ENV === 'production') {
        throw Object.assign(new Error('Isolated execution service is not configured'), { statusCode: 503 });
    }
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
 * Execute an untrusted program under the strongest isolation this host supports.
 *
 * @param {object} options
 * @param {string} options.source    Program text. Sent on stdin; never written to disk.
 * @param {number} [options.timeoutMs]
 * @param {'python'|'javascript'} [options.language]
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number|null,
 *   timedOut: boolean, oom: boolean, truncated: boolean, runner: string}>}
 */
export const executeProgram = async ({
    source, timeoutMs = POLICY.timeoutMs, signal = getExecutionBudget()?.signal, language = 'python',
}) => {
    if (!LANGUAGES.includes(language)) throw new Error(`Unsupported sandbox language: ${language}`);
    const runner = selectRunner();
    // The import firewall is Python-specific; Node relies on --permission.
    const program = language === 'python' ? buildGuardPrologue({ cpuSeconds: Math.max(1, Math.ceil(timeoutMs / 1000)) }) + source : source;
    const queuedAt = Date.now();
    let started = queuedAt;

    // The runner starts its own clock, so time spent queued here does not
    // count against the program's timeout.
    const result = await withSlot(() => {
        started = Date.now();
        return runner(program, timeoutMs, { signal, language });
    }, { signal });

    if (result.error) {
        logger.error(
            { runner: result.runner, err: result.error.message },
            'Code sandbox failed to start',
        );
        throw Object.assign(new Error('Execution infrastructure failed to start'), { statusCode: 503 });
    }

    logger.info(
        {
            runner: result.runner,
            language,
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

export const executePython = (options) => executeProgram({ ...options, language: 'python' });

export { POLICY };
