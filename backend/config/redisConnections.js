import logger from './logger.js';

export function getBullMQConnection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 6379,
    password: parsed.password || undefined,
    username: parsed.username !== 'default' ? parsed.username : undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
