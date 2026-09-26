import mongoose from 'mongoose';
import logger from './logger.js';

const connectDB = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production'
            ? process.env.MONGO_URI
            : process.env.MONGO_URI_DEV;

        if (!uri) {
            throw new Error('MongoDB URI is not defined in environment variables');
        }

        const sanitizedUri = uri.replace(/(mongodb\+srv:\/\/)[^:]+:[^@]+@/, '$1****:****@');
        logger.info({ uri: sanitizedUri }, 'connecting to MongoDB');

        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
        };

        mongoose.connection.on('error', (err) => {
            logger.error({ err }, 'MongoDB connection error');
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        if (process.env.NODE_ENV === 'development') {
            mongoose.set('debug', true);
        }

        await mongoose.connect(uri, options);
        logger.info('MongoDB connected');

    } catch (error) {
        logger.fatal({ err: error }, 'MongoDB connection failed');
        process.exit(1);
    }
};

export { connectDB };
