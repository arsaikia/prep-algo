import { randomUUID } from 'crypto';
import logger from '../config/logger.js';
import { getContentRevision } from '../utils/contentStore.js';

const correlationId = (req, res, next) => {
  const supplied = req.headers['x-correlation-id'];
  const id = typeof supplied === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(supplied) ? supplied : randomUUID();
  req.correlationId = id;
  res.set('X-Correlation-ID', id);

  req.log = logger.child({
    correlationId: id, revision: process.env.K_REVISION || 'local', content: getContentRevision(),
  });

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e6;
    const contentLength = parseInt(res.getHeader('content-length'), 10) || 0;

    const logData = {
      method: req.method,
      url: req.originalUrl,
      route: req.route?.path || req.originalUrl,
      statusCode: res.statusCode,
      duration: Math.round(duration * 100) / 100,
      contentLength,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?._id?.toString() || null,
      rateLimits: req.rateLimits || [],
    };

    if (res.statusCode >= 500) {
      req.log.error(logData, 'request failed');
    } else if (duration > 1000) {
      req.log.warn(logData, 'very slow request');
    } else if (duration > 500) {
      req.log.warn(logData, 'slow request');
    } else {
      req.log.info(logData, 'request completed');
    }
  });

  next();
};

export default correlationId;
