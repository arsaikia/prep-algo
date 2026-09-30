import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import mongoose from 'mongoose';
import logger from './config/logger.js';
import { connectDB } from './config/db.js';
import { connectRedis, disconnectRedis, isRedisAvailable, isRedisConfigured } from './config/redis.js';
import { getAllCircuitBreakerStats } from './config/circuitBreakers.js';
import { getCodeExecutionQueue, getQueueEvents, getQueueStats, closeQueue, isQueueEnabled } from './config/queue.js';
import { startCodeExecutionWorker, stopCodeExecutionWorker } from './workers/codeExecution.js';
import correlationId from './middleware/correlationId.js';
import { protect } from './middleware/auth.js';
import { generalLimiter, codeExecutionLimiter, recommendationLimiter } from './middleware/rateLimiter/index.js';

import progress from './routes/progress.js';
import questions from './routes/questions.js';
import authentication from './routes/authentication.js';
import submission from './routes/submission.js';
import codeExecution from './routes/code.js';
import testRoute from './routes/test.js';
import quiz from './routes/quiz.js';
import { solveHistory } from './routes/solveHistory.js';
import smartRecommendations from './routes/smartRecommendations.js';

dotenv.config();

const app = express();

// Cloud Run's front end terminates the connection and appends the caller's IP
// to X-Forwarded-For; without this every request's req.ip is the proxy's
// 169.254.x address, and all anonymous users share one rate-limit bucket.
app.set('trust proxy', 1);

app.use(correlationId);
app.use(helmet());
app.use(compression());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ["http://localhost:3000", "http://localhost:5173", "https://prepalgo.web.app"];

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

app.get('/health', async (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'ok' : 'down';
    const redisStatus = !isRedisConfigured() ? 'disabled' : isRedisAvailable() ? 'ok' : 'down';
    const breakers = getAllCircuitBreakerStats();
    const mongoBreaker = breakers.mongodb.state;
    const queueStats = isQueueEnabled() ? await getQueueStats() : null;
    const queue = !isQueueEnabled()
        ? { status: 'disabled' }
        : queueStats ? { status: 'ok', ...queueStats } : { status: 'down' };

    let status = 'ok';
    if (mongoStatus === 'down' || mongoBreaker === 'OPEN') status = 'unhealthy';
    else if (redisStatus === 'down') status = 'degraded';

    const code = status === 'unhealthy' ? 503 : 200;
    res.status(code).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        components: {
            mongodb: { status: mongoStatus, circuitBreaker: mongoBreaker },
            redis: { status: redisStatus },
            queue,
            circuitBreakers: breakers,
        },
    });
});

// Global rate limit on all API routes
app.use('/api/', generalLimiter);

// --- Public routes (no auth required) ---
app.use('/api/v1/authentication', authentication);
app.use('/api/v1/questions', questions);
app.use('/api/v1/test', testRoute);
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
    const errorMessage = process.env.NODE_ENV === 'production'
        ? (statusCode < 500 ? err.message : 'Internal Server Error')
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

const startServer = async () => {
    try {
        // Independent connections; connecting them together shortens a cold start.
        await Promise.all([connectDB(), connectRedis()]);

        if (isQueueEnabled() && isRedisAvailable()) {
            getCodeExecutionQueue();
            getQueueEvents();
            startCodeExecutionWorker();
        }

        const PORT = process.env.PORT || 8080;
        app.listen(PORT, '0.0.0.0', () => {
            logger.info({ port: PORT }, 'server started');
        });
    } catch (error) {
        logger.fatal({ err: error }, 'failed to start server');
        process.exit(1);
    }
};

async function gracefulShutdown(signal) {
    logger.info({ signal }, 'shutting down');
    await stopCodeExecutionWorker();
    await closeQueue();
    await disconnectRedis();
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
