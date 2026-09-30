import { Queue, QueueEvents } from 'bullmq';
import { isRedisAvailable } from './redis.js';
import { getBullMQConnection } from './redisConnections.js';
import logger from './logger.js';

let queue = null;
let queueEvents = null;

// BullMQ is opt-in. Its worker holds blocking polls open against Redis, which
// burns a metered command quota (Upstash), and on Cloud Run the worker runs in
// the same container as the API, so the queue adds a hop but no isolation.
export function isQueueEnabled() {
  return process.env.CODE_EXECUTION_QUEUE === 'bullmq';
}

export function getCodeExecutionQueue() {
  if (queue) return queue;
  const connection = getBullMQConnection();
  if (!connection) return null;

  queue = new Queue('code-execution', {
    connection,
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 10,
      attempts: 1,
    },
  });

  queue.on('error', (err) => logger.error({ err }, 'queue error'));
  return queue;
}

export function getQueueEvents() {
  if (queueEvents) return queueEvents;
  const connection = getBullMQConnection();
  if (!connection) return null;

  queueEvents = new QueueEvents('code-execution', { connection });
  queueEvents.on('error', (err) => logger.error({ err }, 'queue events error'));
  return queueEvents;
}

export function isQueueAvailable() {
  return isRedisAvailable() && queue !== null;
}

export async function getQueueStats() {
  if (!queue) return null;
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  } catch {
    return null;
  }
}

export async function closeQueue() {
  if (queueEvents) { await queueEvents.close(); queueEvents = null; }
  if (queue) { await queue.close(); queue = null; }
}
