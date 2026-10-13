/**
 * Remembers failed sign-in attempts per key (client address + username) and blocks
 * further attempts once `max` failures happen inside `windowMs`. In-memory, so it
 * resets on restart and is per process; use a shared store when running several instances.
 */
export class FailedLoginLimiter {
  constructor({ max = 5, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.failures = new Map();
  }

  #recent(key) {
    const cutoff = this.now() - this.windowMs;
    const recent = (this.failures.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length === 0) this.failures.delete(key);
    else this.failures.set(key, recent);
    return recent;
  }

  isBlocked(key) {
    return this.#recent(key).length >= this.max;
  }

  /** Seconds until the oldest counted failure expires and a new attempt is allowed. */
  retryAfterSeconds(key) {
    const recent = this.#recent(key);
    if (recent.length < this.max) return 0;
    return Math.max(1, Math.ceil((recent[0] + this.windowMs - this.now()) / 1000));
  }

  recordFailure(key) {
    this.failures.set(key, [...this.#recent(key), this.now()]);
  }

  reset(key) {
    this.failures.delete(key);
  }
}
