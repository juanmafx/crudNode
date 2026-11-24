export class RateLimiter {
  #windows = new Map();
  #maxRequests;
  #windowMs;
  #maxClients;
  #now;

  constructor({ maxRequests, windowMs, maxClients, now = Date.now }) {
    this.#maxRequests = maxRequests;
    this.#windowMs = windowMs;
    this.#maxClients = maxClients;
    this.#now = now;
  }

  check(clientKey) {
    const now = this.#now();
    let window = this.#windows.get(clientKey);
    if (!window || window.resetAt <= now) {
      if (!window && this.#windows.size >= this.#maxClients) {
        this.#removeExpired(now);
        if (this.#windows.size >= this.#maxClients) {
          return { allowed: false, retryAfterSeconds: Math.ceil(this.#windowMs / 1000) };
        }
      }
      window = { count: 0, resetAt: now + this.#windowMs };
      this.#windows.set(clientKey, window);
    }
    window.count += 1;
    return {
      allowed: window.count <= this.#maxRequests,
      retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
    };
  }

  #removeExpired(now) {
    for (const [key, window] of this.#windows) {
      if (window.resetAt <= now) {
        this.#windows.delete(key);
      }
    }
  }
}
