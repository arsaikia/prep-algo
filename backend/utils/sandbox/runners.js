import { spawn } from 'child_process';

import { POLICY, dockerArgs, nodeArgs } from './policy.js';

const heapExhausted = (stderr) => /JavaScript heap out of memory|Allocation failed/.test(stderr);

/**
 * Shared child-process driver.
 *
 * The timeout is enforced here, in the parent, rather than inside the child:
 * a child that is wedged, forking, or has had its own alarm handlers replaced
 * cannot be trusted to time itself out.
 */
const drive = (command, args, source, { timeoutMs, onKill, signal }) => new Promise((resolve) => {
    signal?.throwIfAborted();
    const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { PATH: process.env.PATH, LANG: 'C.UTF-8', HOME: '/tmp' },
    });

    const chunks = { stdout: [], stderr: [] };
    let bytes = { stdout: 0, stderr: 0 };
    let settled = false;
    let timedOut = false;
    let truncated = false;

    const collect = (stream) => (data) => {
        if (bytes[stream] >= POLICY.maxOutputBytes) {
            truncated = true;
            return;
        }
        const room = POLICY.maxOutputBytes - bytes[stream];
        const slice = data.length > room ? data.subarray(0, room) : data;
        chunks[stream].push(slice);
        bytes[stream] += slice.length;
        if (data.length > room) {
            truncated = true;
            terminate();
        }
    };

    const terminate = () => {
        if (settled) return;
        try {
            if (onKill) onKill();
        } catch {
            // Best effort: the container may already be gone.
        }
        try {
            child.kill('SIGKILL');
        } catch {
            // Already exited.
        }
    };

    const timer = setTimeout(() => {
        timedOut = true;
        terminate();
    }, timeoutMs);
    const aborted = () => terminate();
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) aborted();

    const settle = (exitCode, terminationSignal, error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', aborted);
        resolve({
            stdout: Buffer.concat(chunks.stdout).toString('utf8'),
            stderr: Buffer.concat(chunks.stderr).toString('utf8'),
            exitCode,
            signal: terminationSignal,
            timedOut,
            truncated,
            error,
        });
    };

    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));

    child.on('error', (error) => settle(null, null, error));
    child.on('close', (code, signal) => settle(code, signal));

    // EPIPE is expected when the child dies before consuming its own source.
    child.stdin.on('error', () => {});
    child.stdin.end(source);
});

/**
 * Kernel-enforced isolation: separate namespaces, no network interface at all,
 * read-only root, dropped capabilities, cgroup memory/CPU/PID caps.
 *
 * The program arrives on stdin, so nothing is ever written to the host
 * filesystem and a stock upstream image needs no customisation.
 */
export const dockerRunner = async (source, timeoutMs, { signal, language = 'python' } = {}) => {
    const name = `prepalgo-exec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const args = dockerArgs(language);
    args.splice(2, 0, '--name', name);

    const result = await drive('docker', args, source, {
        timeoutMs,
        signal,
        // Killing the client leaves the container running; kill the container.
        onKill: () => spawn('docker', ['kill', name], { stdio: 'ignore' }).unref(),
    });

    // 137 is SIGKILL, which the OOM killer uses when the cgroup limit is hit.
    const oom = (result.exitCode === 137 || heapExhausted(result.stderr)) && !result.timedOut && !signal?.aborted;

    // 125 is the Docker CLI itself failing (dead daemon, bad flag, missing
    // image) rather than the program. Surfacing it as a generic execution
    // failure would blame the user's code for an infrastructure problem.
    if (result.exitCode === 125) {
        return {
            ...result,
            oom: false,
            runner: 'docker',
            error: new Error(`Sandbox container failed to start: ${result.stderr.trim()}`),
        };
    }

    return { ...result, oom, runner: 'docker' };
};

/**
 * Fallback for hosts that cannot run containers (notably Cloud Run, which
 * offers neither privileged mode nor a Docker socket).
 *
 * -I ignores PYTHON* environment variables and the user site directory;
 * -S skips site.py. Together they stop the surrounding environment from
 * reintroducing import paths the guard has not vetted.
 */
export const subprocessRunner = async (source, timeoutMs, { signal, language = 'python' } = {}) => {
    const javascript = language === 'javascript';
    const result = await drive(
        javascript ? process.execPath : 'python3',
        javascript ? nodeArgs() : ['-I', '-S', '-'],
        source,
        { timeoutMs, signal, onKill: null },
    );

    const oom = javascript ? heapExhausted(result.stderr) : /MemoryError/.test(result.stderr);
    return { ...result, oom, runner: 'subprocess' };
};
