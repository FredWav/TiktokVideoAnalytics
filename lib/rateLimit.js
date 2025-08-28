// Simple in-memory sliding window rate limiter (per key, e.g. IP)
// Not production-grade for multi-instance setups (needs external store like KV/Redis)
import { config } from './config.js';
import logger from './logger.js';

const buckets = new Map(); // key -> array of timestamps (ms)

export function rateLimitCheck(key) {
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const max = config.rateLimit.max;

  if (!buckets.has(key)) {
    buckets.set(key, [now]);
    return { allowed: true, remaining: max - 1 };
  }

  const arr = buckets.get(key).filter(ts => ts > now - windowMs);
  arr.push(now);
  buckets.set(key, arr);

  if (arr.length > max) {
    logger.debug('[rateLimit] blocked', { key, count: arr.length });
    return { allowed: false, remaining: 0, retryAfterMs: arr[0] + windowMs - now };
  }

  return { allowed: true, remaining: max - arr.length };
}