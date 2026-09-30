import Redis from 'ioredis';
import logger from './logger.js';

let redisClient = null;
let connectionAttempted = false;
let lastErrorLoggedAt = 0;

const ERROR_LOG_INTERVAL_MS = 60_000;

export function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

function createClient(url) {
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    // Never give up: a client that stops retrying leaves this instance on the
    // in-memory fallback, diverging from its siblings, until it is recycled.
    retryStrategy: (times) => Math.min(times * 500, 30_000),
    connectTimeout: 5000,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  client.on('ready', () => {
    lastErrorLoggedAt = 0;
    logger.info('Redis connected');
  });

  // While Redis is unreachable every reconnect attempt errors; log the first
  // and then at most once a minute.
  client.on('error', (err) => {
    const now = Date.now();
    if (now - lastErrorLoggedAt < ERROR_LOG_INTERVAL_MS) return;
    lastErrorLoggedAt = now;
    logger.error({ err }, 'Redis error — using in-memory fallback while it reconnects');
  });

  return client;
}

export async function connectRedis() {
  if (connectionAttempted) return redisClient;
  connectionAttempted = true;

  if (!isRedisConfigured()) {
    logger.warn('REDIS_URL not set — running without Redis (in-memory fallback)');
    return null;
  }

  redisClient = createClient(process.env.REDIS_URL);
  try {
    await redisClient.connect();
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable at startup — will keep retrying in the background');
  }
  return redisClient;
}

export function getRedis() {
  return redisClient?.status === 'ready' ? redisClient : null;
}

export function isRedisAvailable() {
  return getRedis() !== null;
}

export async function disconnectRedis() {
  if (!redisClient) return;
  const client = redisClient;
  redisClient = null;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
}
