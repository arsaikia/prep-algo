import Redis from 'ioredis';

let redisClient = null;
let isConnected = false;
let connectionAttempted = false;

function createClient() {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn('REDIS_URL not set — running without Redis (in-memory fallback)');
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on('connect', () => {
    isConnected = true;
    console.log('Redis connected');
  });

  client.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  client.on('close', () => {
    isConnected = false;
  });

  return client;
}

export async function connectRedis() {
  if (connectionAttempted) return redisClient;
  connectionAttempted = true;

  redisClient = createClient();
  if (!redisClient) return null;

  try {
    await redisClient.connect();
    return redisClient;
  } catch (err) {
    console.warn('Redis connection failed — running without Redis:', err.message);
    redisClient = null;
    return null;
  }
}

export function getRedis() {
  return isConnected ? redisClient : null;
}

export function isRedisAvailable() {
  return isConnected && redisClient !== null;
}

export async function disconnectRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}
