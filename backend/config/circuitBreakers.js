import { CircuitBreaker } from '../utils/circuitBreaker.js';
import logger from './logger.js';

function onStateChange(name, oldState, newState) {
  logger.warn({ breaker: name, oldState, newState }, 'circuit breaker state change');
}

export const mongoCircuitBreaker = new CircuitBreaker({
  name: 'mongodb',
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

export function getAllCircuitBreakerStats() {
  return {
    mongodb: mongoCircuitBreaker.getStats(),
    externalApi: externalApiCircuitBreaker.getStats(),
  };
}
