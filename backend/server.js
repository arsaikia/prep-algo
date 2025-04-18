import colors from 'colors';
import express from 'express';
import dotenv from 'dotenv';
import exphbs from 'express-handlebars';
import bodyParser from 'body-parser';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { connectDB } from './config/db.js';
import performanceMonitor from './middleware/performance.js';

import { allQuestions } from './routes/all.js';
import { getQuestions } from './routes/getQuestions.js';
import { authentication } from './routes/authentication.js';
import { solveHistory } from './routes/solveHistory.js';

dotenv.config();

// Connect to mongo
connectDB();

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
const BASE_URI = process.env.BASE_URI || "http://localhost:3000";
const corsOptions = {
    origin: BASE_URI,
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

// Mount routers
app.use('/api/v1/questions', getQuestions);

// Error handling for unhandled routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Listen to the PORT
const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
    return console.log(`Server started on PORT ${PORT}`.yellow.bold);
});