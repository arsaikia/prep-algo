import { CircuitBreaker } from '../utils/circuitBreaker.js';
import logger from './logger.js';

function onStateChange(name, oldState, newState) {
  logger.warn({ breaker: name, oldState, newState }, 'circuit breaker state change');
}

export const postgresCircuitBreaker = new CircuitBreaker({
  name: 'postgres',
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenMaxAttempts: 3,
  onStateChange,
});

export const externalApiCircuitBreaker = new CircuitBreaker({
  name: 'externalApi',
  failureThreshold: 3,
  resetTimeout: 60000,
  halfOpenMaxAttempts: 2,
  onStateChange,
});

// Network-level failures that mean "the database cannot be reached", as
// opposed to errors caused by the statement itself (constraint violations,
// bad input). Only these should trip the breaker or surface as 503.
const UNAVAILABLE_NODE_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE', 'EHOSTUNREACH', 'ENETUNREACH',
]);
const UNAVAILABLE_PG_CODES = new Set(['57P01', '57P02', '57P03', '57014', '53300', '53400']);

export function isDatabaseUnavailableError(err) {
  if (!err) return false;
  if (err.name === 'CircuitBreakerOpenError') return true;
  const code = typeof err.code === 'string' ? err.code : '';
  if (UNAVAILABLE_NODE_CODES.has(code) || UNAVAILABLE_PG_CODES.has(code) || code.startsWith('08')) return true;
  // Statement errors always carry a SQLSTATE; a sanitized pg error without
  // one came from the connection layer (pool/connect/read timeouts).
  if (err.isSanitizedPostgresError && !code) return true;
  const message = typeof err.message === 'string' ? err.message : '';
  return /Connection terminated|timeout exceeded when trying to connect|Query read timeout|pool is ended|Cannot use a pool after calling end/i.test(message);
}

// Runs a database call through the postgres breaker; statement-level errors
// pass through without counting as outages.
export async function withPostgresBreaker(fn) {
  const outcome = await postgresCircuitBreaker.execute(async () => {
    try {
      return { value: await fn() };
    } catch (error) {
      if (isDatabaseUnavailableError(error)) throw error;
      return { error };
    }
  });
  if (outcome.error) throw outcome.error;
  return outcome.value;
}

export function getAllCircuitBreakerStats() {
  return {
    postgres: postgresCircuitBreaker.getStats(),
    externalApi: externalApiCircuitBreaker.getStats(),
  };
}
