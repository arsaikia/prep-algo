// Must stay first: imported modules (rate limiter, Google client)
// read process.env while loading.
import 'dotenv/config';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import logger from './config/logger.js';
import {
    connectPostgres,
    disconnectPostgres,
    getPostgresStatus,
    getPool,
    assertSchemaReady,
    syncContentCatalog,
    withTransaction,
} from './config/postgres.js';
import { connectRedis, disconnectRedis, isRedisAvailable, isRedisConfigured } from './config/redis.js';
import { getAllCircuitBreakerStats } from './config/circuitBreakers.js';
import correlationId from './middleware/correlationId.js';
import { protect } from './middleware/auth.js';
import { generalLimiter, codeExecutionLimiter, recommendationLimiter } from './middleware/rateLimiter/index.js';

import progress from './routes/progress.js';
import questions from './routes/questions.js';
import authentication from './routes/authentication.js';
import submission from './routes/submission.js';
import codeExecution from './routes/code.js';
import quiz from './routes/quiz.js';
import { solveHistory } from './routes/solveHistory.js';
import smartRecommendations from './routes/smartRecommendations.js';
import { getContentRevision } from './utils/contentStore.js';
import { getExecutionLoad } from './utils/executionBudget.js';
import { getMigrationStatus } from './scripts/migratePostgres.js';

const app = express();

// Cloud Run's front end terminates the connection and appends the caller's IP
// to X-Forwarded-For; without this every request's req.ip is the proxy's
// 169.254.x address, and all anonymous users share one rate-limit bucket.
app.set('trust proxy', 1);

app.use(correlationId);
app.use(helmet());
app.use(compression());

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173", "https://prepalgo.web.app"];

logger.info({ origins: corsOrigins }, 'CORS origins configured');

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
        if (corsOrigins.includes(origin) || isLocalhost) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400
}
app.use(cors(corsOptions));

// Cache policy: deny by default. Only the anonymous, non-user-specific
// question catalog may sit in a browser or CDN cache — anything tied to a
// user must never land in a shared cache, or one account's data can be
// served to another.
const PUBLIC_CACHE_MAX_AGE = 300;

app.use((req, res, next) => {
    const isPublicCatalog =
        req.method === 'GET' &&
        req.path.startsWith('/api/v1/questions') &&
        !req.path.startsWith('/api/v1/questions/get-questions') &&
        !req.headers.authorization;

    if (isPublicCatalog) {
        res.set('Cache-Control', `public, max-age=${PUBLIC_CACHE_MAX_AGE}`);
        res.vary('Authorization');
    } else {
        res.set('Cache-Control', 'no-store, private');
    }
    next();
});

// Lifecycle flags read by the readiness probe. `startupComplete` flips once
// Postgres is reachable, the schema is migrated and the catalog is synced.
const lifecycle = { startupComplete: false, shuttingDown: false };

// Summary/liveness stay cheap. Only explicit readiness probes query Postgres.
function postgresComponent() {
    const cached = getPostgresStatus();
    const breaker = getAllCircuitBreakerStats().postgres.state;
    return {
        status: cached.status,
        circuitBreaker: breaker,
        lastCheckedAt: cached.lastCheckedAt,
        source: 'cached',
        pool: cached.pool,
    };
}

// Liveness: the process is up and serving HTTP. No dependency checks.
app.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export async function probePostgres({ pool = getPool(), timeoutMs = 2500 } = {}) {
    let client;
    let timedOut = false;
    let failed = false;
    let timer;
    try {
        await Promise.race([
            (async () => {
                client = await pool.connect();
                if (timedOut) {
                    client.release(true);
                    client = null;
                    return;
                }
                await client.query({ text: 'SELECT 1', query_timeout: timeoutMs });
            })(),
            new Promise((resolve, reject) => {
                timer = setTimeout(() => {
                    timedOut = true;
                    reject(new Error('PostgreSQL readiness timed out'));
                }, timeoutMs);
            }),
        ]);
    } catch (error) {
        failed = true;
        throw error;
    } finally {
        clearTimeout(timer);
        // Destroy a timed-out client rather than returning an in-flight query
        // to the pool. A late connection acquisition is released above.
        client?.release(timedOut || failed);
    }
}

export function createReadinessHandler({
    state = lifecycle,
    probe = probePostgres,
    component = postgresComponent,
} = {}) {
    return async (req, res) => {
        const postgres = { ...component(), source: 'probe' };
        const reasons = [];
        if (state.shuttingDown) reasons.push('shutting_down');
        if (!state.startupComplete) reasons.push('starting');
        try {
            await probe();
            postgres.status = 'ok';
        } catch {
            postgres.status = 'down';
            reasons.push('postgres_down');
        }
        postgres.lastCheckedAt = new Date().toISOString();
        if (postgres.circuitBreaker === 'OPEN') reasons.push('postgres_circuit_open');

        const ready = reasons.length === 0;
        res.status(ready ? 200 : 503).json({
            status: ready ? 'ready' : 'not_ready',
            ...(ready ? {} : { reasons }),
            timestamp: new Date().toISOString(),
            components: { postgres },
        });
    };
}

// Readiness explicitly wakes/checks the database with a bounded SELECT 1.
app.get('/health/ready', createReadinessHandler());

app.get('/health', (req, res) => {
    const postgres = postgresComponent();
    const redisStatus = !isRedisConfigured() ? 'disabled' : isRedisAvailable() ? 'ok' : 'down';
    const breakers = getAllCircuitBreakerStats();

    let status = 'ok';
    if (lifecycle.shuttingDown || postgres.status !== 'ok' || postgres.circuitBreaker === 'OPEN') status = 'unhealthy';
    else if (redisStatus === 'down') status = 'degraded';

    const code = status === 'unhealthy' ? 503 : 200;
    res.status(code).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        release: { revision: process.env.K_REVISION || 'local', content: getContentRevision() },
        components: {
            postgres,
            redis: { status: redisStatus },
            execution: {
                status: process.env.CODE_EXECUTOR_URL ? 'remote_configured'
                    : process.env.NODE_ENV === 'production' ? 'disabled' : 'local_development',
                ...getExecutionLoad(),
            },
            circuitBreakers: breakers,
        },
    });
});

// Global rate limit on all API routes
app.use('/api/', generalLimiter);

// --- Public routes (no auth required) ---
app.use('/api/v1/authentication', authentication);
app.use('/api/v1/questions', questions);
app.use('/api/v1/quiz', quiz);

// --- Protected routes (auth required) ---
app.use('/api/v1/submission', protect, submission);
app.use('/api/v1/code', protect, codeExecutionLimiter, codeExecution);
app.use('/api/v1/progress', progress);
app.use('/api/v1/solveHistory', protect, solveHistory);
app.use('/api/v1/recommendations', protect, recommendationLimiter, smartRecommendations);

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    const log = req.log || logger;
    log.error({ err }, 'unhandled error');

    const statusCode = err.statusCode || err.status || 500;
    if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
    const errorMessage = process.env.NODE_ENV === 'production'
        ? (statusCode < 500 ? err.message : 'Internal Server Error')
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Arbitrary constant so concurrent instances serialize their catalog sync.
const CATALOG_SYNC_LOCK_ID = 7_340_212;

// Migrations are applied out of band (`npm run db:migrate`) before deploys;
// an instance only verifies the schema and refuses to start without it.
async function preparePostgres() {
    await connectPostgres();
    await assertSchemaReady();
    // Newer applied migrations are expected after a rollback; expand/contract
    // keeps them compatible (scripts/release/rollback.mjs enforces it).
    const migrations = await getMigrationStatus({ pool: getPool(), allowNewer: true });
    if (migrations.pending.length) throw new Error('Pending PostgreSQL migrations; run npm run db:migrate before starting');
    if (migrations.newer.length) {
        logger.warn({ newer: migrations.newer }, 'database schema is newer than this release (rollback)');
    }
    if (process.env.CONTENT_CATALOG_SYNC === 'false') {
        logger.warn('CONTENT_CATALOG_SYNC=false — skipping content catalog sync');
        return;
    }
    const revision = getContentRevision();
    if (!revision) throw new Error('Content release identity missing; rebuild content before starting');
    const current = await getPool().query('SELECT revision FROM content_catalog_state WHERE singleton');
    if (current.rows[0]?.revision === revision) {
        logger.info({ revision }, 'content catalog already current');
        return;
    }
    const result = await withTransaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock($1)', [CATALOG_SYNC_LOCK_ID]);
        const existing = await client.query('SELECT revision FROM content_catalog_state WHERE singleton');
        if (existing.rows[0]?.revision === revision) return { skipped: true };
        const result = await syncContentCatalog(client);
        await client.query(`INSERT INTO content_catalog_state (singleton, revision) VALUES (true, $1)
            ON CONFLICT (singleton) DO UPDATE SET revision = EXCLUDED.revision, updated_at = now()`, [revision]);
        return result;
    });
    logger.info(result, 'content catalog synced');
}

let httpServer = null;

export async function startServer() {
    try {
        // Independent connections; connecting them together shortens a cold start.
        await Promise.all([preparePostgres(), connectRedis()]);

        const PORT = process.env.PORT || 8080;
        await new Promise((resolve, reject) => {
            httpServer = app.listen(PORT, '0.0.0.0', resolve);
            httpServer.once('error', reject);
        });
        lifecycle.startupComplete = true;
        logger.info({ port: PORT }, 'server started');
    } catch (error) {
        logger.fatal({ err: error }, 'failed to start server');
        await releaseResources();
        process.exit(1);
    }
}

async function closeHttpServer() {
    if (!httpServer) return;
    const server = httpServer;
    httpServer = null;
    await new Promise((resolve) => {
        server.close((err) => {
            if (err) logger.warn({ err }, 'HTTP server did not close cleanly');
            resolve();
        });
        // Let in-flight requests finish, then drop idle keep-alive sockets.
        server.closeIdleConnections?.();
    });
}

async function releaseResources() {
    const steps = [
        ['redis', disconnectRedis],
        ['postgres', disconnectPostgres],
    ];
    for (const [name, step] of steps) {
        try {
            await step();
        } catch (err) {
            logger.warn({ err, component: name }, 'shutdown step failed');
        }
    }
}

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function gracefulShutdown(signal) {
    if (lifecycle.shuttingDown) return;
    lifecycle.shuttingDown = true;
    logger.info({ signal }, 'shutting down');

    const forceExit = setTimeout(() => {
        logger.error('graceful shutdown timed out — forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    await closeHttpServer();
    await releaseResources();
    clearTimeout(forceExit);
    process.exit(0);
}

function isEntrypoint() {
    if (!process.argv[1]) return false;
    try {
        return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
    } catch {
        return false;
    }
}

export { app };

if (isEntrypoint()) {
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    startServer();
}
