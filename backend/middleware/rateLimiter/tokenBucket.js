import { getRedis } from '../../config/redis.js';

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
end

local elapsed = now - lastRefill
local tokensToAdd = math.floor(elapsed * refillRate / 1000)
tokens = math.min(capacity, tokens + tokensToAdd)

if tokensToAdd > 0 then
  lastRefill = now
end

if tokens > 0 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('PEXPIRE', key, math.ceil(capacity / refillRate * 1000) + 1000)
  return {0, tokens}
else
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
  local waitMs = math.ceil(1000 / refillRate)
  return {1, waitMs}
end
`;

export function createTokenBucketLimiter({ capacity, refillRate, keyPrefix }) {
  const inMemoryStore = new Map();

  async function checkLimit(identifier) {
    const redis = getRedis();

    if (redis) {
      try {
        const key = `ratelimit:${keyPrefix}:${identifier}`;
        const now = Date.now();
        const result = await redis.eval(TOKEN_BUCKET_SCRIPT, 1, key, capacity, refillRate, now);
        return {
          limited: result[0] === 1,
          remaining: result[0] === 0 ? result[1] : 0,
          retryAfterMs: result[0] === 1 ? result[1] : 0,
        };
      } catch (err) {
        console.warn('Redis token bucket error, falling back to in-memory:', err.message);
      }
    }

    const now = Date.now();
    const key = `${keyPrefix}:${identifier}`;
    let bucket = inMemoryStore.get(key);

    if (!bucket) {
      bucket = { tokens: capacity, lastRefill: now };
      inMemoryStore.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed * refillRate / 1000);
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    if (tokensToAdd > 0) bucket.lastRefill = now;

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return { limited: false, remaining: bucket.tokens, retryAfterMs: 0 };
    }

    return { limited: true, remaining: 0, retryAfterMs: Math.ceil(1000 / refillRate) };
  }

  return checkLimit;
}
