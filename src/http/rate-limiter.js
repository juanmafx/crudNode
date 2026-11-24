import { isIPv6 } from 'node:net';

const IPV6_GROUP_COUNT = 8;
const IPV6_PREFIX_GROUP_COUNT = 4;
const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

function toIpv6Prefix(address) {
  const [head, tail] = address.split('%')[0].toLowerCase().split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const tailSize = tailGroups.reduce((size, group) => size + (group.includes('.') ? 2 : 1), 0);
  const zeroGroups = tail === undefined ? [] : Array(IPV6_GROUP_COUNT - headGroups.length - tailSize).fill('0');
  const prefix = [...headGroups, ...zeroGroups, ...tailGroups]
    .slice(0, IPV6_PREFIX_GROUP_COUNT)
    .map((group) => group.replace(/^0+(?=.)/, ''));
  return `${prefix.join(':')}::/64`;
}

export function toClientKey(address) {
  if (!address) {
    return 'unknown';
  }
  const mapped = IPV4_MAPPED.exec(address);
  if (mapped) {
    return mapped[1];
  }
  return isIPv6(address) ? toIpv6Prefix(address) : address;
}

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
