import logger from '../../config/logger.js';
import { createSlidingWindowLimiter } from './slidingWindow.js';
import { createTokenBucketLimiter } from './tokenBucket.js';

function getIdentifier(req) {
  if (req.user) return `user:${req.user._id}`;
  return `ip:${req.ip}`;
}

function createRateLimitMiddleware(checkLimit, { windowMs, max, message, failClosed = false }) {
  return async (req, res, next) => {
    try {
      const id = getIdentifier(req);
      const started = Date.now();
      const result = await checkLimit(id);
      (req.rateLimits ||= []).push({ backend: result.backend, durationMs: Date.now() - started, limited: result.limited });

      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', String(result.remaining));

      const resetSeconds = Math.ceil((result.resetMs || windowMs) / 1000);
      res.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + resetSeconds));

      if (result.limited) {
        const retryAfter = Math.ceil((result.retryAfterMs || result.resetMs || windowMs) / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({ success: false, error: message });
      }

      next();
    } catch (err) {
      logger.error({ err }, 'rate limiter error');
      if (failClosed) {
        res.set('Retry-After', '2');
        return res.status(503).json({ success: false, error: 'Request admission unavailable; retry shortly' });
      }
      next();
    }
  };
}

export const generalLimiter = createRateLimitMiddleware(
  createSlidingWindowLimiter({ windowMs: 60_000, max: 100, keyPrefix: 'general' }),
  { windowMs: 60_000, max: 100, message: 'Too many requests, please try again later' }
);

export const authLimiter = createRateLimitMiddleware(
  createSlidingWindowLimiter({ windowMs: 15 * 60_000, max: 20, keyPrefix: 'auth' }),
  { windowMs: 15 * 60_000, max: 20, message: 'Too many authentication attempts, please try again later', failClosed: true }
);

export const codeExecutionLimiter = createRateLimitMiddleware(
  createTokenBucketLimiter({ capacity: 10, refillRate: 0.167, keyPrefix: 'code' }),
  { windowMs: 60_000, max: 10, message: 'Too many code execution requests, please slow down', failClosed: true }
);

export const recommendationLimiter = createRateLimitMiddleware(
  createSlidingWindowLimiter({ windowMs: 60_000, max: 15, keyPrefix: 'recommendations' }),
  { windowMs: 60_000, max: 15, message: 'Too many recommendation requests, please slow down' }
);
