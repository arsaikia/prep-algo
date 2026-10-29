import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth();
let client;

export async function remoteRunner(source, timeoutMs, { signal } = {}) {
    const url = new URL(process.env.CODE_EXECUTOR_URL);
    if (url.protocol !== 'https:' || url.username || url.password) {
        throw Object.assign(new Error('Executor URL must use HTTPS'), { statusCode: 503 });
    }
    const audience = process.env.CODE_EXECUTOR_AUDIENCE || url.origin;
    client ||= auth.getIdTokenClient(audience).catch(error => {
        client = undefined;
        throw error;
    });
    // Queueing and transport need headroom beyond the executor's program clock.
    const timer = AbortSignal.timeout(timeoutMs + 3000);
    const combined = signal ? AbortSignal.any([signal, timer]) : timer;
    try {
        // Token acquisition must obey the same request deadline as transport.
        const headers = await new Promise((resolve, reject) => {
            const abort = () => reject(combined.reason);
            combined.addEventListener('abort', abort, { once: true });
            if (combined.aborted) abort();
            client.then(value => value.getRequestHeaders(audience)).then(resolve, reject)
                .finally(() => combined.removeEventListener('abort', abort));
        });
        const authorization = headers.Authorization || headers.authorization || headers.get?.('authorization');
        const response = await fetch(new URL('/execute', url), {
            method: 'POST',
            headers: { Authorization: authorization, 'Content-Type': 'application/json' },
            body: JSON.stringify({ source, timeoutMs }),
            signal: combined,
        });
        if (!response.ok) {
            const statusCode = response.status === 429 || response.status === 503 ? 503 : 502;
            throw Object.assign(new Error('Execution service unavailable; retry shortly'), { statusCode, retryAfter: 2 });
        }
        const reader = response.body.getReader();
        let length = 0;
        const chunks = [];
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.length;
            if (length > 3 * 1024 * 1024) {
                await reader.cancel();
                throw new Error('Executor response exceeds limit');
            }
            chunks.push(Buffer.from(value));
        }
        const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (typeof result.stdout !== 'string' || typeof result.stderr !== 'string' ||
            !(result.exitCode === null || Number.isInteger(result.exitCode)) ||
            typeof result.timedOut !== 'boolean' || typeof result.oom !== 'boolean') {
            throw new Error('Invalid executor response');
        }
        return { ...result, runner: 'remote-docker' };
    } catch (error) {
        if (timer.aborted && !signal?.aborted) {
            throw Object.assign(new Error('Execution service deadline exceeded'), { statusCode: 504 });
        }
        if (error.statusCode || signal?.aborted) throw error;
        throw Object.assign(new Error('Execution service request failed', { cause: error }), { statusCode: 503 });
    }
}
