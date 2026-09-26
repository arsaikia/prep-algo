import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: isProduction ? 'info' : 'debug',
  base: { service: 'prep-algo-backend', env: process.env.NODE_ENV || 'development' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProduction ? {} : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});

export default logger;
