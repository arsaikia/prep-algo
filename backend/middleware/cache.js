import NodeCache from 'node-cache';
import logger from '../config/logger.js';

// Only immutable-in-this-process public catalog routes use this cache.
// Redis adds no consistency benefit for content already bundled in each revision.
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60, maxKeys: 500, useClones: false });

export default function cacheMiddleware(req, res, next) {
    if (req.method !== 'GET' || req.headers.authorization) return next();
    const key = req.originalUrl || req.url;
    const value = cache.get(key);
    if (value !== undefined) return res.status(200).type('json').send(value);
    const send = res.send;
    res.send = function (body) {
        if (res.statusCode === 200) {
            try {
                cache.set(key, body);
            } catch (error) {
                logger.warn({ code: error.errorcode }, 'public content cache capacity reached');
            }
        }
        return send.call(this, body);
    };
    return next();
}
