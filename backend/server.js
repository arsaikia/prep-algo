import colors from 'colors';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import performanceMonitor from './middleware/performance.js';

import questions from './routes/questions.js';
import authentication from './routes/authentication.js';
import submission from './routes/submission.js';
import codeExecution from './routes/code.js';
import testRoute from './routes/test.js';
import { solveHistory } from './routes/solveHistory.js';
import adaptiveRecommendations from './routes/adaptiveRecommendations.js';
import smartRecommendations from './routes/smartRecommendations.js';

// Load environment variables
dotenv.config();

const app = express();

// Performance monitoring
app.use(performanceMonitor);

// Security middleware
app.use(helmet());

// Enable compression
app.use(compression());

// Body Parser with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Allow CORS with specific options
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ["http://localhost:3000", "https://prepalgo.web.app"]; // Development fallback

console.log('CORS Origins configured:', corsOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (corsOrigins.includes(origin)) {
            console.log('CORS: Origin allowed:', origin);
            callback(null, true);
        } else {
            console.log('CORS: Origin blocked:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
}
app.use(cors(corsOptions));

// Cache control middleware
app.use((req, res, next) => {
    // Only cache GET requests
    if (req.method === 'GET') {
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    } else {
        res.set('Cache-Control', 'no-store');
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Mount routers
app.use('/api/v1/authentication', authentication);
app.use('/api/v1/questions', questions);
app.use('/api/v1/submission', submission);
app.use('/api/v1/code', codeExecution);
app.use('/api/v1/test', testRoute);
app.use('/api/v1/solveHistory', solveHistory);
app.use('/api/v1/adaptive-recommendations', adaptiveRecommendations);
app.use('/api/v1/smart-recommendations', smartRecommendations);

// Error handling for unhandled routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
});

// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Listen to the PORT
        const PORT = process.env.PORT || 8080;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server started on PORT ${PORT}`.yellow.bold);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();