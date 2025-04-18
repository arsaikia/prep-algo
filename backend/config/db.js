import colors from 'colors';
import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production'
            ? process.env.MONGO_URI
            : process.env.MONGO_URI_DEV;

        if (!uri) {
            throw new Error('MongoDB URI is not defined in environment variables');
        }

        // Log connection attempt (with sanitized URI)
        const sanitizedUri = uri.replace(/(mongodb\+srv:\/\/)[^:]+:[^@]+@/, '$1****:****@');
        console.log(`Attempting to connect to MongoDB at ${sanitizedUri}`);

        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4  // Force IPv4
        };

        // Set up event listeners before connecting
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        // Enable debug mode in development
        if (process.env.NODE_ENV === 'development') {
            mongoose.set('debug', true);
        }

        // Attempt connection
        await mongoose.connect(uri, options);

        console.log('MongoDB connected successfully');

        // Handle process termination
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error during MongoDB connection closure:', err);
                process.exit(1);
            }
        });

    } catch (error) {
        console.error('MongoDB connection error:', error.message);

        // Provide more specific error messages
        if (error.name === 'MongoServerSelectionError') {
            console.error('Could not connect to MongoDB server. Please check if:');
            console.error('1. The MongoDB server is running');
            console.error('2. The connection string is correct');
            console.error('3. The network allows the connection');
        } else if (error.name === 'MongoParseError') {
            console.error('Invalid MongoDB connection string. Please check the format.');
        } else if (error.name === 'MongoNetworkError') {
            console.error('Network error while connecting to MongoDB. Please check your network connection.');
        }

        // Exit the process with error
        process.exit(1);
    }
};

export { connectDB };
