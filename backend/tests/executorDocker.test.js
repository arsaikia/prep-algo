import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockerRunner } from '../utils/sandbox/runners.js';
import { POLICY } from '../utils/sandbox/policy.js';
import { createExecutorApp } from '../executor/server.js';
import { once } from 'node:events';

const options = { skip: process.env.RUN_DOCKER_ACCEPTANCE !== '1' && 'Opt in on a Docker host with the sandbox image pre-pulled' };

test('real Docker enforces network, identity, capabilities, filesystem and cgroup boundaries without the Python guard', options, async () => {
    const result = await dockerRunner(`
import os, json, socket, errno
sock = socket.socket()
sock.settimeout(0.1)
checks = {
  "uid": os.getuid(),
  "routes": open("/proc/net/route").read().splitlines()[1:],
  "networkDenied": sock.connect_ex(("192.0.2.1", 9)) == errno.ENETUNREACH,
  "memory": open("/sys/fs/cgroup/memory.max").read().strip(),
  "pids": open("/sys/fs/cgroup/pids.max").read().strip(),
  "cpu": open("/sys/fs/cgroup/cpu.max").read().strip(),
  "caps": next(line.split()[1] for line in open("/proc/self/status") if line.startswith("CapEff:")),
  "secret": os.environ.get("JWT_SECRET"),
}
try:
  open("/prepalgo-readonly-probe", "w").close()
  checks["readonly"] = False
except OSError:
  checks["readonly"] = True
print(json.dumps(checks))
`, 5000);
    assert.equal(result.exitCode, 0, result.stderr);
    const checks = JSON.parse(result.stdout);
    assert.equal(checks.uid, 65534);
    assert.deepEqual(checks.routes, []);
    assert.equal(checks.networkDenied, true);
    assert.equal(Number(checks.memory), POLICY.memoryMb * 1024 * 1024);
    assert.equal(Number(checks.pids), POLICY.maxProcesses);
    const [quota, period] = checks.cpu.split(' ').map(Number);
    assert.equal(quota / period, Number(POLICY.cpus));
    assert.equal(Number.parseInt(checks.caps, 16), 0);
    assert.equal(checks.secret, null);
    assert.equal(checks.readonly, true);
});

test('real Docker terminates runaway programs and enforces the memory ceiling', options, async () => {
    const timeout = await dockerRunner('while True: pass', 500);
    assert.equal(timeout.timedOut, true);
    const memory = await dockerRunner(`x = bytearray(${POLICY.memoryMb * 2} * 1024 * 1024)`, 5000);
    assert.equal(memory.oom, true, memory.stderr);
});

test('real Docker executor rejects overload, cancels disconnected work and recovers', options, async () => {
    let active = 0;
    let peak = 0;
    let cancellations = 0;
    const app = createExecutorApp({
        verify: async token => { assert.equal(token, 'local-acceptance'); },
        run: async (source, timeoutMs, { signal }) => {
            active++;
            peak = Math.max(peak, active);
            try {
                const result = await dockerRunner(source, timeoutMs, { signal });
                if (signal.aborted) {
                    cancellations++;
                    assert.equal(result.oom, false);
                }
                return result;
            } finally { active--; }
        },
    });
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}/execute`;
    const controllers = [];
    const send = source => {
        const controller = new AbortController();
        controllers.push(controller);
        return fetch(url, {
            method: 'POST',
            headers: { Authorization: 'Bearer local-acceptance', 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, timeoutMs: 2000 }),
            signal: controller.signal,
        });
    };
    try {
        const requests = Array.from({ length: 10 }, () => send('import time; time.sleep(1); print("ok")'));
        const responses = await Promise.all(requests);
        assert.ok(responses.some(response => response.status === 503));
        for (const response of responses) {
            assert.ok([200, 503].includes(response.status));
            if (response.status === 503) assert.equal(response.headers.get('retry-after'), '2');
            await response.arrayBuffer();
        }
        assert.equal(peak, 1);
        const disconnected = send('import time; time.sleep(10)');
        // The outstanding read always has a rejection handler before cancellation.
        const rejected = assert.rejects(disconnected, error => error.name === 'AbortError');
        await new Promise(resolve => setTimeout(resolve, 400));
        controllers.at(-1).abort();
        await rejected;
        const response = await send('print("recovered")');
        assert.equal(response.status, 200);
        assert.equal((await response.json()).stdout.trim(), 'recovered');
        assert.equal(cancellations, 1);
        assert.equal(active, 0);
    } finally {
        controllers.forEach(controller => controller.abort());
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});
