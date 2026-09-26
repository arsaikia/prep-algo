const STATES = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

export class CircuitBreakerOpenError extends Error {
  constructor(name) {
    super(`Circuit breaker "${name}" is open`);
    this.name = 'CircuitBreakerOpenError';
    this.statusCode = 503;
  }
}

export class CircuitBreaker {
  constructor({ name, failureThreshold = 5, resetTimeout = 30000, halfOpenMaxAttempts = 3, onStateChange = null }) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.halfOpenMaxAttempts = halfOpenMaxAttempts;
    this.onStateChange = onStateChange;

    this.state = STATES.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = null;
    this.totalTrips = 0;
  }

  async execute(fn) {
    if (this.state === STATES.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this._transition(STATES.HALF_OPEN);
      } else {
        throw new CircuitBreakerOpenError(this.name);
      }
    }

    if (this.state === STATES.HALF_OPEN && this.halfOpenAttempts >= this.halfOpenMaxAttempts) {
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      if (this.state === STATES.HALF_OPEN) this.halfOpenAttempts++;
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  _onSuccess() {
    this.successes++;
    if (this.state === STATES.HALF_OPEN) {
      this._transition(STATES.CLOSED);
    }
    this.failures = 0;
  }

  _onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === STATES.HALF_OPEN) {
      this._transition(STATES.OPEN);
      return;
    }

    if (this.failures >= this.failureThreshold) {
      this._transition(STATES.OPEN);
    }
  }

  _transition(newState) {
    const oldState = this.state;
    this.state = newState;

    if (newState === STATES.OPEN) this.totalTrips++;
    if (newState === STATES.HALF_OPEN) this.halfOpenAttempts = 0;
    if (newState === STATES.CLOSED) {
      this.failures = 0;
      this.halfOpenAttempts = 0;
    }

    if (this.onStateChange) this.onStateChange(this.name, oldState, newState);
  }

  getState() { return this.state; }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      totalTrips: this.totalTrips,
    };
  }

  reset() { this._transition(STATES.CLOSED); }
}
