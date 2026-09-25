import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

const TTL_CONFIG = {
  questions: 86400,       // 24 hours — question data rarely changes
  recommendations: 300,   // 5 minutes — recommendations are personalized and refresh often
  user: 1800,             // 30 minutes — user profile data
  default: 3600,          // 1 hour fallback
};

function getTTL(url) {
  if (url.includes('/questions')) return TTL_CONFIG.questions;
  if (url.includes('/recommendations') || url.includes('/smart-recommendations')) return TTL_CONFIG.recommendations;
  if (url.includes('/authentication/user/')) return TTL_CONFIG.user;
  return TTL_CONFIG.default;
}

const cacheMiddleware = (req, res, next) => {
  if (req.method !== 'GET') return next();

  const key = `__express__${req.originalUrl || req.url}`;
  const cachedBody = cache.get(key);

  if (cachedBody) {
    return res.status(200).send(cachedBody);
  }

  const originalSend = res.send;
  res.send = function (body) {
    if (res.statusCode === 200) {
      cache.set(key, body, getTTL(req.originalUrl));
    }
    originalSend.call(this, body);
  };

  next();
};

export function invalidateCache(pattern) {
  const keys = cache.keys();
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.del(key);
    }
  }
}

export function invalidateUserCache(userId) {
  invalidateCache(`/recommendations/${userId}`);
  invalidateCache(`/smart-recommendations/${userId}`);
  invalidateCache(`/solveHistory/${userId}`);
  invalidateCache(`/get-questions/${userId}`);
}

export default cacheMiddleware;
