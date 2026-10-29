export class TimeTracker {
  constructor({ storage = () => globalThis.localStorage, storageKey = 'currentSession', now = Date.now, onStorageError = () => {} } = {}) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.now = now;
    this.onStorageError = onStorageError;
    this.state = null;
  }

  persist() {
    try {
      if (this.state) this.storage().setItem(this.storageKey, JSON.stringify(this.state));
      else this.storage().removeItem(this.storageKey);
    } catch {
      this.onStorageError();
    }
  }

  restoreSession() {
    try {
      const saved = JSON.parse(this.storage().getItem(this.storageKey) || 'null');
      if (!saved || !Number.isFinite(saved.startedAt) || !Number.isFinite(saved.pausedMs)
          || saved.pausedMs < 0 || !Array.isArray(saved.tags) || !saved.questionId || !saved.userId
          || (saved.pausedAt !== null && !Number.isFinite(saved.pausedAt))
          || (saved.endedAt !== null && !Number.isFinite(saved.endedAt))) return false;
      this.state = saved;
      return true;
    } catch {
      this.onStorageError();
      return false;
    }
  }

  startTracking(questionId, userId) {
    if (!this.state) this.restoreSession();
    if (this.state?.questionId === questionId && this.state.userId === 'guest'
        && userId !== 'guest' && this.state.endedAt === null) {
      this.state.userId = userId;
      this.persist();
      return;
    }
    if (this.state?.questionId === questionId && this.state?.userId === userId && this.state.endedAt === null) return;
    this.state = { questionId, userId, startedAt: this.now(), endedAt: null, pausedAt: null, pausedMs: 0, tags: [], difficultyRating: null };
    this.persist();
  }

  get isPaused() { return this.state?.pausedAt != null; }
  get isTracking() { return Boolean(this.state && this.state.endedAt === null); }

  pause() {
    if (!this.isTracking || this.isPaused) return;
    this.state.pausedAt = this.now();
    this.persist();
  }

  resume() {
    if (!this.isTracking || !this.isPaused) return;
    this.state.pausedMs += Math.max(0, this.now() - this.state.pausedAt);
    this.state.pausedAt = null;
    this.persist();
  }

  getElapsedSeconds() {
    if (!this.state) return 0;
    const until = this.state.endedAt ?? this.state.pausedAt ?? this.now();
    return Math.min(86400, Math.max(0, Math.floor((until - this.state.startedAt - this.state.pausedMs) / 1000)));
  }

  getCurrentTime() { return this.getElapsedSeconds() / 60; }

  stopTracking(success = true, difficultyRating = null, tags = []) {
    if (!this.state) return null;
    const timeSpent = this.getCurrentTime();
    this.state.endedAt = this.state.pausedAt ?? this.now();
    this.state.pausedAt = null;
    this.persist();
    return { ...this.state, success, difficultyRating, tags: [...this.state.tags, ...tags], timeSpent };
  }

  addTags(tags) {
    if (!this.state) return;
    this.state.tags = [...new Set([...this.state.tags, ...tags])];
    this.persist();
  }

  setDifficultyRating(rating) {
    if (!this.state || rating < 1 || rating > 5) return;
    this.state.difficultyRating = rating;
    this.persist();
  }

  reset() { this.state = null; this.persist(); }
}
