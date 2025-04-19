import NodeCache from 'node-cache';

// Initialize cache with 60 minutes standard TTL
const cache = new NodeCache({ stdTTL: 3600 });

// Cache middleware
const cacheMiddleware = async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
        console.log(`Cache hit for ${req.originalUrl}`);

        // Check if this is a user endpoint response
        if (req.originalUrl.includes('/authentication/user/')) {
            return res.status(200).json({
                success: true,
                user: cachedResponse
            });
        }

        // Format the cached response to match the database response structure
        return res.status(200).json({
            success: true,
            count: cachedResponse.length,
            data: cachedResponse
        });
    }

    console.log(`Cache miss for ${req.originalUrl}`);

    // Store the original send
    const originalSend = res.send;

    // Override send
    res.send = function (body) {
        // Only cache successful responses
        if (res.statusCode === 200) {
            try {
                // Parse the response body if it's a string
                const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;

                // Check if this is a user endpoint response
                if (req.originalUrl.includes('/authentication/user/') && parsedBody && parsedBody.user) {
                    cache.set(key, parsedBody.user, 3600);
                }
                // Store only the data array from the response
                else if (parsedBody && parsedBody.data) {
                    cache.set(key, parsedBody.data, 3600);
                }
            } catch (error) {
                console.error('Error caching response:', error);
            }
        }
        originalSend.call(this, body);
    };

    next();
};

export default cacheMiddleware; 