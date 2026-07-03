const NodeCache = require('node-cache');
const config = require('../../../config/config');

// Separate cache instances for different TTLs
const pricesCache = new NodeCache({ stdTTL: config.cacheTtl.prices, checkperiod: 60 });
const historyCache = new NodeCache({ stdTTL: config.cacheTtl.history, checkperiod: 120 });
const goldCache = new NodeCache({ stdTTL: config.cacheTtl.gold, checkperiod: 60 });
const craftingCache = new NodeCache({ stdTTL: config.cacheTtl.crafting, checkperiod: 300 });

const caches = { prices: pricesCache, history: historyCache, gold: goldCache, crafting: craftingCache };

/**
 * Express middleware factory that caches GET responses.
 * @param {'prices'|'history'|'gold'|'crafting'} cacheType
 */
function cacheMiddleware(cacheType) {
  const cache = caches[cacheType];

  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = `${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached !== undefined) {
      console.log(`[CACHE HIT] ${cacheType} -> ${key}`);
      return res.json(cached);
    }

    console.log(`[CACHE MISS] ${cacheType} -> ${key}`);

    // Intercept res.json to store the response in cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        cache.set(key, body);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Returns cache statistics for all cache types.
 */
function getCacheStats() {
  return {
    prices: { ...pricesCache.getStats(), ttlSeconds: config.cacheTtl.prices },
    history: { ...historyCache.getStats(), ttlSeconds: config.cacheTtl.history },
    gold: { ...goldCache.getStats(), ttlSeconds: config.cacheTtl.gold },
    crafting: { ...craftingCache.getStats(), ttlSeconds: config.cacheTtl.crafting },
  };
}

/**
 * Flushes all caches.
 */
function flushAll() {
  pricesCache.flushAll();
  historyCache.flushAll();
  goldCache.flushAll();
  craftingCache.flushAll();
}

module.exports = { cacheMiddleware, getCacheStats, flushAll };
