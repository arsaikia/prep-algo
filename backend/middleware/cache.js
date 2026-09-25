import NodeCache from 'node-cache';
import { getRedis } from '../config/redis.js';

const localCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const TTL_CONFIG = {
  questions: 86400,
  recommendations: 300,
  user: 1800,
  default: 3600,
};

const CACHE_PREFIX = 'prepalgo:cache:';
const LOCK_PREFIX = 'prepalgo:lock:';
const LOCK_TTL_MS = 5000;

function getTTL(url) {
  if (url.includes('/questions')) return TTL_CONFIG.questions;
  if (url.includes('/recommendations') || url.includes('/smart-recommendations')) return TTL_CONFIG.recommendations;
  if (url.includes('/authentication/user/')) return TTL_CONFIG.user;
  return TTL_CONFIG.default;
}

async function getFromRedis(key) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function setInRedis(key, value, ttlSeconds) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, 'EX', ttlSeconds);
  } catch (err) {
    console.warn('Redis cache set error:', err.message);
  }
}

async function acquireLock(key) {
  const redis = getRedis();
  if (!redis) return true;
  try {
    const result = await redis.set(key, '1', 'PX', LOCK_TTL_MS, 'NX');
    return result === 'OK';
  } catch {
    return true;
  }
}

async function releaseLock(key) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {}
}

const cacheMiddleware = (req, res, next) => {
  if (req.method !== 'GET') return next();

  const cacheKey = `${CACHE_PREFIX}${req.originalUrl || req.url}`;
  const lockKey = `${LOCK_PREFIX}${req.originalUrl || req.url}`;
  const ttl = getTTL(req.originalUrl);

  (async () => {
    const redisValue = await getFromRedis(cacheKey);
    if (redisValue) {
      return res.status(200).type('json').send(redisValue);
    }

    const localValue = localCache.get(cacheKey);
    if (localValue) {
      return res.status(200).send(localValue);
    }

    const gotLock = await acquireLock(lockKey);
    if (!gotLock) {
      await new Promise(r => setTimeout(r, 100));
      const retryValue = await getFromRedis(cacheKey);
      if (retryValue) {
        return res.status(200).type('json').send(retryValue);
      }
    }

    const originalSend = res.send;
    res.send = function (body) {
      if (res.statusCode === 200) {
        localCache.set(cacheKey, body, Math.min(ttl, 300));
        setInRedis(cacheKey, typeof body === 'string' ? body : JSON.stringify(body), ttl);
        releaseLock(lockKey);
      }
      originalSend.call(this, body);
    };

    next();
  })();
};

export async function invalidateCache(pattern) {
  const localKeys = localCache.keys();
  for (const key of localKeys) {
    if (key.includes(pattern)) {
      localCache.del(key);
    }
  }

  const redis = getRedis();
  if (redis) {
    try {
      const keys = await redis.keys(`${CACHE_PREFIX}*${pattern}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.warn('Redis cache invalidation error:', err.message);
    }
  }
}

export async function invalidateUserCache(userId) {
  await invalidateCache(`/recommendations/${userId}`);
  await invalidateCache(`/smart-recommendations/${userId}`);
  await invalidateCache(`/solveHistory/${userId}`);
  await invalidateCache(`/get-questions/${userId}`);
}

export default cacheMiddleware;
