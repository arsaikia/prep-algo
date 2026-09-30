import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BLOCKED_MODULES, POLICY, dockerArgs } from '../utils/sandbox/policy.js';
import { buildGuardPrologue } from '../utils/sandbox/pythonGuard.js';
import { executePython } from '../utils/sandbox/index.js';

/**
 * These tests exercise the subprocess runner, which is the weaker of the two
 * layers. Anything proven blocked here is also blocked under Docker, where the
 * kernel enforces the same boundaries independently.
 *
 * Docker mode is covered by argument-composition assertions rather than live
 * container runs, so the suite stays hermetic and needs no image pulls.
 */

const run = (source) => executePython({ source, timeoutMs: 4000 });

const isBlocked = (result) => result.exitCode !== 0
    && /blocked by the execution sandbox/.test(result.stderr);

describe('sandbox: legitimate code still works', () => {
    it('runs a normal solution', async () => {
        const result = await run('print(sum([1, 2, 3]))');
        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout.trim(), '6');
    });

    it('allows the stdlib modules solutions actually use', async () => {
        const result = await run([
            'import math, collections, itertools, heapq, bisect, functools, re, string',
            'from typing import List, Optional, Dict',
            'print(math.gcd(12, 18), len(collections.Counter("aab")))',
        ].join('\n'));
        assert.equal(result.exitCode, 0, result.stderr);
        assert.equal(result.stdout.trim(), '6 2');
    });

    it('names the module the user imported when it is transitively unusable', async () => {
        // random imports os internally, so it cannot work once the firewall is
        // installed. The error must point at random, not at os inside random.py.
        const result = await run('import random');
        assert.match(result.stderr, /import of 'random' is blocked/);
    });

    it('keeps eval available, which the test harness depends on', async () => {
        const result = await run('print(eval("[1, 2, 3]")[1])');
        assert.equal(result.exitCode, 0, result.stderr);
        assert.equal(result.stdout.trim(), '2');
    });

    it('reports ordinary runtime errors as the program\'s own failure', async () => {
        const result = await run('raise ValueError("boom")');
        assert.equal(result.exitCode, 1);
        assert.match(result.stderr, /ValueError: boom/);
        assert.ok(!isBlocked(result), 'should not be attributed to the sandbox');
    });
});

describe('sandbox: network access is blocked', () => {
    for (const mod of ['socket', 'ssl', 'urllib', 'http', 'asyncio', 'smtplib']) {
        it(`blocks import of ${mod}`, async () => {
            assert.ok(isBlocked(await run(`import ${mod}`)));
        });
    }

    it('blocks a submodule of a blocked package', async () => {
        assert.ok(isBlocked(await run('import urllib.request')));
    });

    it('blocks from-import syntax', async () => {
        assert.ok(isBlocked(await run('from socket import socket')));
    });
});

describe('sandbox: filesystem access is blocked', () => {
    it('blocks reading an arbitrary host file', async () => {
        const result = await run('print(open("/etc/passwd").read())');
        assert.notEqual(result.exitCode, 0);
        assert.match(result.stderr, /blocked by the execution sandbox/);
    });

    it('blocks writing a file', async () => {
        const result = await run('open("/tmp/prepalgo-pwn", "w").write("x")');
        assert.notEqual(result.exitCode, 0);
        assert.match(result.stderr, /blocked by the execution sandbox/);
    });

    for (const mod of ['os', 'shutil', 'pathlib', 'tempfile', 'glob', 'sqlite3']) {
        it(`blocks import of ${mod}`, async () => {
            assert.ok(isBlocked(await run(`import ${mod}`)));
        });
    }
});

describe('sandbox: process and syscall escapes are blocked', () => {
    for (const mod of ['subprocess', 'multiprocessing', 'ctypes', 'mmap', 'pty', 'fcntl']) {
        it(`blocks import of ${mod}`, async () => {
            assert.ok(isBlocked(await run(`import ${mod}`)));
        });
    }

    it('blocks the __import__ builtin as a bypass', async () => {
        assert.ok(isBlocked(await run('__import__("os").system("id")')));
    });

    it('blocks importlib as a bypass', async () => {
        assert.ok(isBlocked(await run('import importlib')));
    });

    it('blocks reaching a blocked module through eval', async () => {
        assert.ok(isBlocked(await run('eval("__import__(\'socket\')")')));
    });

    it('blocks a cached module being served from sys.modules', async () => {
        // site/encodings pull some of these in at startup; the guard purges the
        // cache so a later import cannot be satisfied without the firewall.
        const result = await run('import sys; print("os" in sys.modules)');
        assert.equal(result.exitCode, 0, result.stderr);
        assert.equal(result.stdout.trim(), 'False');
    });
});

describe('sandbox: resource limits', () => {
    it('terminates a program that exceeds the wall clock', async () => {
        const result = await executePython({ source: 'while True: pass', timeoutMs: 1500 });
        assert.equal(result.timedOut, true);
        assert.notEqual(result.exitCode, 0);
    });

    it('truncates runaway output instead of buffering it without bound', async () => {
        const result = await executePython({
            source: 'while True: print("x" * 4096)',
            timeoutMs: 4000,
        });
        assert.equal(result.truncated, true);
        assert.ok(
            result.stdout.length <= POLICY.maxOutputBytes,
            `retained ${result.stdout.length} bytes, cap is ${POLICY.maxOutputBytes}`,
        );
    });

    it('never writes the submission to the host filesystem', async () => {
        // The program travels on stdin, so there is no temp file to leak or
        // race on. argv carries only interpreter flags.
        const result = await run('import sys; print(sys.argv)');
        assert.equal(result.exitCode, 0, result.stderr);
        assert.ok(!/\.py/.test(result.stdout), `argv referenced a file: ${result.stdout}`);
    });
});

describe('sandbox: guard prologue', () => {
    const prologue = buildGuardPrologue();

    it('installs the firewall before any user code can run', () => {
        assert.ok(prologue.indexOf('_sys.meta_path.insert(0') > 0);
    });

    it('bans file writes at the kernel level', () => {
        assert.match(prologue, /_limit\('RLIMIT_FSIZE', 0\)/);
    });

    it('caps memory and CPU from policy', () => {
        assert.ok(prologue.includes(`_limit('RLIMIT_AS', ${POLICY.memoryMb * 1024 * 1024})`));
        assert.ok(prologue.includes(`_limit('RLIMIT_CPU', ${POLICY.cpuSeconds})`));
    });

    it('lists every blocked module', () => {
        for (const mod of BLOCKED_MODULES) {
            assert.ok(prologue.includes(`'${mod}'`), `missing ${mod}`);
        }
    });
});

describe('sandbox: docker isolation flags', () => {
    const args = dockerArgs();

    it('removes the network interface entirely', () => {
        assert.ok(args.includes('--network=none'));
    });

    it('mounts the root filesystem read-only with a non-executable scratch space', () => {
        assert.ok(args.includes('--read-only'));
        assert.ok(args.includes('/tmp:rw,noexec,nosuid,size=8m'));
    });

    it('drops all capabilities and forbids privilege escalation', () => {
        assert.ok(args.includes('--cap-drop=ALL'));
        assert.ok(args.includes('--security-opt=no-new-privileges'));
    });

    it('runs unprivileged', () => {
        assert.ok(args.includes('65534:65534'));
    });

    it('caps memory, swap, CPU and PIDs from policy', () => {
        assert.ok(args.includes(`--memory=${POLICY.memoryMb}m`));
        assert.ok(args.includes(`--memory-swap=${POLICY.memoryMb}m`), 'swap must match memory');
        assert.ok(args.includes(`--cpus=${POLICY.cpus}`));
        assert.ok(args.includes(`--pids-limit=${POLICY.maxProcesses}`));
    });

    it('reads the program from stdin rather than a mounted file', () => {
        assert.ok(args.includes('--interactive'));
        assert.equal(args[args.length - 1], '-');
        assert.ok(!args.some((a) => a.includes('--volume') || a.includes('--mount')));
    });

    it('starts the interpreter isolated from ambient configuration', () => {
        assert.ok(args.includes('-I'));
        assert.ok(args.includes('-S'));
    });
});
