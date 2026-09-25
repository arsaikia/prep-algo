import colors from 'colors';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import performanceMonitor from './middleware/performance.js';
import { protect } from './middleware/auth.js';
import { generalLimiter, authLimiter, codeExecutionLimiter, recommendationLimiter } from './middleware/rateLimiter/index.js';

import questions from './routes/questions.js';
import authentication from './routes/authentication.js';
import submission from './routes/submission.js';
import codeExecution from './routes/code.js';
import testRoute from './routes/test.js';
import { solveHistory } from './routes/solveHistory.js';
import smartRecommendations from './routes/smartRecommendations.js';

dotenv.config();

const app = express();

app.use(performanceMonitor);
app.use(helmet());
app.use(compression());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ["http://localhost:3000", "http://localhost:5173", "https://prepalgo.web.app"];

console.log('CORS Origins configured:', corsOrigins);

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

app.use((req, res, next) => {
    if (req.method === 'GET') {
        res.set('Cache-Control', 'public, max-age=3600');
    } else {
        res.set('Cache-Control', 'no-store');
    }
    next();
});

// Health check — no auth, no rate limit
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Global rate limit on all API routes
app.use('/api/', generalLimiter);

// --- Public routes (no auth required) ---
app.use('/api/v1/authentication', authLimiter, authentication);
app.use('/api/v1/questions', questions);
app.use('/api/v1/test', testRoute);

// --- Protected routes (auth required) ---
app.use('/api/v1/submission', protect, submission);
app.use('/api/v1/code', protect, codeExecutionLimiter, codeExecution);
app.use('/api/v1/solveHistory', protect, solveHistory);
app.use('/api/v1/recommendations', protect, recommendationLimiter, smartRecommendations);

app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    console.error('Error stack:', err.stack);

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
        await connectDB();
        await connectRedis();

        const PORT = process.env.PORT || 8080;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server started on PORT ${PORT}`.yellow.bold);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

process.on('SIGINT', async () => {
    await disconnectRedis();
    process.exit(0);
});

startServer();
