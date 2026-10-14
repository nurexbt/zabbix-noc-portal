/**
 * In-memory TTL Caching Layer
 * Prevents redundant Zabbix JSON-RPC calls on dashboard reloads
 */
export class MemoryCache {
  constructor(defaultTtlSeconds = 15) {
    this.defaultTtl = defaultTtlSeconds * 1000;
    this.store = new Map();
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  set(key, value, ttlSeconds = null) {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtl;
    this.store.set(key, {
      value,
      expiry: Date.now() + ttl,
      created: Date.now()
    });
  }

  del(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  stats() {
    const now = Date.now();
    let validCount = 0;
    for (const [key, item] of this.store.entries()) {
      if (now <= item.expiry) validCount++;
      else this.store.delete(key);
    }
    return {
      entries: validCount,
      defaultTtlSeconds: this.defaultTtl / 1000
    };
  }
}

export const cache = new MemoryCache(
  parseInt(process.env.CACHE_TTL_SECONDS || '15', 10)
);
