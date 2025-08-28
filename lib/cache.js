// Very small in-memory TTL + size-bounded cache
import { config } from './config.js';
import logger from './logger.js';

class TTLCache {
  constructor({ ttlSeconds, maxItems }) {
    this.ttl = ttlSeconds * 1000;
    this.max = maxItems;
    this.store = new Map(); // key -> { value, expires }
  }

  _purgeExpired() {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (v.expires <= now) this.store.delete(k);
    }
  }

  _evictIfNeeded() {
    if (this.store.size <= this.max) return;
    // Evict oldest (small LRU-ish by insertion order after re-set)
    const toRemove = this.store.size - this.max;
    for (let i = 0; i < toRemove; i++) {
      const firstKey = this.store.keys().next().value;
      if (firstKey === undefined) break;
      this.store.delete(firstKey);
    }
  }

  get(key) {
    this._purgeExpired();
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency: re-set
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, customTTL) {
    this._purgeExpired();
    const ttl = (customTTL ?? this.ttl);
    this.store.set(key, { value, expires: Date.now() + ttl });
    this._evictIfNeeded();
  }

  stats() {
    this._purgeExpired();
    return { size: this.store.size, ttlMs: this.ttl, max: this.max };
  }
}

export const cache = new TTLCache({
  ttlSeconds: config.cacheTtlSeconds,
  maxItems: config.maxCachedItems
});

logger.debug('[cache] initialized', cache.stats());

export default cache;