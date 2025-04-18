/**
 * Performance monitoring middleware
 * Tracks response times for API endpoints
 */

const performanceMonitor = (req, res, next) => {
    // Start timing
    const start = process.hrtime();

    // Log when response is finished
    res.on('finish', () => {
        // Calculate duration in milliseconds
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        // Log request details and duration
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);

        // Log slow requests (over 500ms)
        if (duration > 500) {
            console.warn(`⚠️ Slow request detected: ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`);
        }
    });

    next();
};

export default performanceMonitor; 