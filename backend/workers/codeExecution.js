import { Worker } from 'bullmq';
import { runCode } from '../utils/codeExecution.js';
import { getBullMQConnection } from '../config/redisConnections.js';
import logger from '../config/logger.js';

let worker = null;

export function startCodeExecutionWorker() {
  const connection = getBullMQConnection();
  if (!connection) {
    logger.warn('no Redis connection — code execution worker not started');
    return null;
  }

  worker = new Worker(
    'code-execution',
    async (job) => {
      const { code, testCases, questionTypes } = job.data;
      logger.info({ jobId: job.id }, 'processing code execution job');
      const results = await runCode(code, testCases, questionTypes);
      return results;
    },
    { connection, concurrency: 2 }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'code execution job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'code execution job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'code execution worker error');
  });

  logger.info('code execution worker started');
  return worker;
}

export async function stopCodeExecutionWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('code execution worker stopped');
  }
}
