/**
 * Sandbox execution policy.
 *
 * Every limit lives here rather than inline at the spawn site, so the security
 * posture can be reviewed in one place and tuned per environment without
 * touching execution logic.
 */

const int = (value, fallback) => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const POLICY = {
    /**
     * docker     - kernel-enforced isolation (namespaces, cgroups, dropped caps).
     * subprocess - in-process hardening only. Defence in depth, NOT a boundary.
     * auto       - docker when the daemon answers, else subprocess.
     */
    get mode() { return process.env.CODE_SANDBOX_MODE || 'auto'; },

    /** Stock image. The program arrives on stdin, so no custom build is needed. */
    get image() { return process.env.CODE_SANDBOX_IMAGE || 'python:3.11-alpine'; },

    /** Wall-clock ceiling, enforced by the parent and independent of the child. */
    get timeoutMs() { return int(process.env.CODE_SANDBOX_TIMEOUT_MS, 5000); },

    /** Memory ceiling. cgroups under docker, RLIMIT_AS otherwise. */
    get memoryMb() { return int(process.env.CODE_SANDBOX_MEMORY_MB, 256); },

    /** Fraction of a core. Docker only; subprocess mode relies on RLIMIT_CPU. */
    get cpus() { return process.env.CODE_SANDBOX_CPUS || '0.5'; },

    /** Fork-bomb ceiling. */
    get maxProcesses() { return int(process.env.CODE_SANDBOX_MAX_PROCESSES, 64); },

    /** Bytes of stdout/stderr retained before the child is torn down. */
    get maxOutputBytes() { return int(process.env.CODE_SANDBOX_MAX_OUTPUT_BYTES, 1024 * 1024); },

    /** CPU-seconds before SIGXCPU. Derived from the wall clock, floor of 1s. */
    get cpuSeconds() { return Math.max(1, Math.ceil(this.timeoutMs / 1000)); },
};

/**
 * Modules no interview solution has a legitimate reason to touch, each of which
 * offers a route to the filesystem, the network, or the host.
 *
 * ctypes and mmap matter as much as socket: they permit raw syscalls that would
 * step straight over a pure-Python blocklist.
 */
export const BLOCKED_MODULES = [
    'os', 'subprocess', 'socket', 'ssl', 'shutil', 'pathlib',
    'ctypes', 'mmap', 'multiprocessing', 'threading', 'signal', 'resource',
    'importlib', 'runpy', 'pty', 'tty', 'fcntl', 'termios', 'select',
    'http', 'urllib', 'ftplib', 'smtplib', 'poplib', 'imaplib',
    'xmlrpc', 'asyncio', 'webbrowser', 'pickle', 'shelve', 'dbm', 'sqlite3',
    'tempfile', 'glob', 'fileinput', 'py_compile', 'compileall',
    'pdb', 'bdb', 'cProfile', 'trace', 'atexit', 'platform', 'getpass',
    'pwd', 'grp', 'posix', 'nt', 'msvcrt', 'winreg', 'site', 'code', 'codeop',

    // Listed for a different reason: these are unusable anyway, because they
    // import os or threading internally and the firewall has already closed
    // that route. Naming them explicitly turns a confusing traceback pointing
    // inside random.py at os into an error that names what the user imported.
    //
    // None of them belong in a graded solution regardless: random, secrets and
    // uuid are non-deterministic, statistics builds on random, and queue is a
    // thread-safe structure where collections.deque is the right answer.
    'random', 'secrets', 'uuid', 'statistics', 'queue',
];

/**
 * Docker flags in the order a reviewer should read them: no network, no
 * writable filesystem, no capabilities, no privilege escalation, bounded
 * memory/CPU/PIDs, unprivileged UID.
 *
 * -I (isolated) ignores PYTHON* env vars and the user site directory;
 * -S skips site.py. Together they stop the environment from reintroducing
 * import paths the guard has not vetted.
 */
export const dockerArgs = () => [
    'run', '--rm', '--interactive',
    '--network=none',
    '--read-only',
    '--tmpfs', '/tmp:rw,noexec,nosuid,size=8m',
    `--memory=${POLICY.memoryMb}m`,
    `--memory-swap=${POLICY.memoryMb}m`,
    `--cpus=${POLICY.cpus}`,
    `--pids-limit=${POLICY.maxProcesses}`,
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--user', '65534:65534',
    '--env', 'PYTHONDONTWRITEBYTECODE=1',
    '--env', 'HOME=/tmp',
    POLICY.image,
    'python3', '-I', '-S', '-',
];
