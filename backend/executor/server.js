import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { dockerRunner } from '../utils/sandbox/runners.js';
import { LANGUAGES } from '../utils/sandbox/policy.js';
import { limitConcurrency } from '../utils/limitConcurrency.js';
import { requestExecutionSignal } from '../utils/executionBudget.js';
import logger from '../config/logger.js';

const identity = new OAuth2Client();
const execFileAsync = promisify(execFile);

export async function verifyCaller(token) {
    const audience = process.env.EXECUTOR_AUDIENCE;
    const callers = (process.env.EXECUTOR_CALLERS || '').split(',').filter(Boolean);
    if (!audience || !callers.length) throw new Error('Executor identity policy is not configured');
    const ticket = await identity.verifyIdToken({ idToken: token, audience });
    const claims = ticket.getPayload();
    if (claims.email_verified !== true || !callers.includes(claims.email)) throw new Error('Caller not permitted');
}

export function createExecutorApp({ verify = verifyCaller, run = dockerRunner, ready = () => true, languages = LANGUAGES } = {}) {
    const app = express();
    app.disable('x-powered-by');
    const admission = limitConcurrency(1, { maxQueue: 8, queueTimeoutMs: 2000 });
    app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
    app.get('/health/ready', async (req, res, next) => {
        try {
            const available = await ready();
            res.status(available ? 200 : 503).json({ ready: available });
        } catch (error) {
            next(error);
        }
    });
    app.post('/execute', async (req, res, next) => {
        try {
            const match = /^Bearer (.+)$/.exec(req.get('Authorization') || '');
            if (!match) return res.status(401).json({ error: 'Executor authentication required' });
            await verify(match[1]);
            next();
        } catch {
            res.status(403).json({ error: 'Executor caller not permitted' });
        }
    }, express.json({ limit: '256kb' }), async (req, res, next) => {
        const { source, timeoutMs, language = 'python' } = req.body || {};
        if (typeof source !== 'string' || !source.length || source.length > 100000 ||
            !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000 || !LANGUAGES.includes(language)) {
            return res.status(400).json({ error: 'Invalid execution request' });
        }
        if (!languages.includes(language)) {
            return res.status(503).json({ error: `Execution runtime for ${language} is not installed` });
        }
        const signal = requestExecutionSignal(req, res);
        const started = Date.now();
        try {
            const result = await admission(() => run(source, timeoutMs, { signal, language }), { signal });
            if (result.error) throw Object.assign(new Error('Docker execution failed'), { statusCode: 503 });
            if (!signal.aborted) res.json(result);
        } catch (error) {
            next(error);
        } finally {
            logger.info({ durationMs: Date.now() - started, ...admission.stats() }, 'isolated execution finished');
        }
    });
    app.use((error, req, res, next) => {
        logger.error({ err: error }, 'isolated executor request failed');
        if (res.destroyed || res.headersSent) return;
        if (error.retryAfter) res.set('Retry-After', String(error.retryAfter));
        res.status(error.statusCode || error.status || 500).json({ error: 'Execution service request failed' });
    });
    return app;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    for (const name of ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'IMPORT_MONGO_URI', 'GOOGLE_CLIENT_SECRET']) {
        if (process.env[name]) throw new Error(`Executor must not receive application secret ${name}`);
    }
    if (!process.env.EXECUTOR_AUDIENCE || !process.env.EXECUTOR_CALLERS) throw new Error('Executor identity policy required');
    if (!/@sha256:[a-f0-9]{64}$/.test(process.env.CODE_SANDBOX_IMAGE || '')) {
        throw new Error('Executor requires CODE_SANDBOX_IMAGE pinned to a verified image digest');
    }
    const probe = spawnSync('docker', ['info'], { stdio: 'ignore', timeout: 3000 });
    if (probe.status !== 0) throw new Error('Executor requires a working Docker runtime; subprocess fallback is forbidden');
    const image = spawnSync('docker', ['image', 'inspect', process.env.CODE_SANDBOX_IMAGE], { stdio: 'ignore', timeout: 3000 });
    if (image.status !== 0) throw new Error('Executor requires its pinned sandbox image to be pre-pulled');
    // JavaScript is optional so an executor provisioned before it existed keeps serving Python.
    const languages = ['python'];
    if (process.env.CODE_SANDBOX_NODE_IMAGE) {
        if (!/@sha256:[a-f0-9]{64}$/.test(process.env.CODE_SANDBOX_NODE_IMAGE)) {
            throw new Error('Executor requires CODE_SANDBOX_NODE_IMAGE pinned to a verified image digest');
        }
        const nodeImage = spawnSync('docker', ['image', 'inspect', process.env.CODE_SANDBOX_NODE_IMAGE], { stdio: 'ignore', timeout: 3000 });
        if (nodeImage.status !== 0) throw new Error('Executor requires its pinned Node sandbox image to be pre-pulled');
        languages.push('javascript');
    }
    let checkedAt = 0;
    let readiness;
    const ready = () => {
        if (!readiness || Date.now() - checkedAt > 10000) {
            checkedAt = Date.now();
            readiness = execFileAsync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 3000, maxBuffer: 16384 })
                .then(() => true, error => {
                    logger.warn({ message: error.message }, 'executor Docker readiness failed');
                    return false;
                });
        }
        return readiness;
    };
    const server = createExecutorApp({ ready, languages }).listen(
        process.env.PORT || 8081, process.env.EXECUTOR_BIND_ADDRESS || '127.0.0.1',
    );
    process.once('SIGTERM', () => {
        server.close();
        setTimeout(() => process.exit(1), 9000).unref();
    });
}
