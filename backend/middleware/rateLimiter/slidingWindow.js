import { getRedis } from '../../config/redis.js';

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local windowStart = now - window

redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
local count = redis.call('ZCARD', key)

if count < limit then
  redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
  redis.call('PEXPIRE', key, window)
  return {0, limit - count - 1, window}
else
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local resetMs = 0
  if #oldest >= 2 then
    resetMs = tonumber(oldest[2]) + window - now
  end
  return {1, 0, resetMs}
end
`;

export function createSlidingWindowLimiter({ windowMs, max, keyPrefix }) {
  const inMemoryStore = new Map();

  function cleanupInMemory() {
    const now = Date.now();
    for (const [key, timestamps] of inMemoryStore) {
      const valid = timestamps.filter(t => t > now - windowMs);
      if (valid.length === 0) {
        inMemoryStore.delete(key);
      } else {
        inMemoryStore.set(key, valid);
      }
    }
  }

  setInterval(cleanupInMemory, 60000);

  async function checkLimit(identifier) {
    const redis = getRedis();

    if (redis) {
      try {
        const key = `ratelimit:${keyPrefix}:${identifier}`;
        const now = Date.now();
        const result = await redis.eval(SLIDING_WINDOW_SCRIPT, 1, key, windowMs, max, now);
        return {
          limited: result[0] === 1,
          remaining: result[1],
          resetMs: result[2],
        };
      } catch (err) {
        // Redis rate limit error — falling back to in-memory
      }
    }

    const now = Date.now();
    const key = `${keyPrefix}:${identifier}`;
    let timestamps = inMemoryStore.get(key) || [];
    timestamps = timestamps.filter(t => t > now - windowMs);

    if (timestamps.length < max) {
      timestamps.push(now);
      inMemoryStore.set(key, timestamps);
      return { limited: false, remaining: max - timestamps.length, resetMs: windowMs };
    }

    const resetMs = timestamps[0] + windowMs - now;
    return { limited: true, remaining: 0, resetMs };
  }

  return checkLimit;
}
