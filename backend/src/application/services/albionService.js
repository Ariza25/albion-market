const axios = require('axios');
const config = require('../../config/config');
const persistentCache = require('../../infrastructure/cache/persistentCache');

const client = axios.create({
  baseURL: config.baseUrl,
  timeout: config.albionApi.timeoutMs,
  headers: { Accept: 'application/json' },
});

const status = {
  requests: 0,
  failures: 0,
  retries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  staleFallbacks: 0,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastError: null,
};

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────

/**
 * Resolve the base URL for a given server override.
 * Falls back to the configured default server.
 */
function resolveBaseUrl(serverOverride) {
  const servers = {
    europe: 'https://europe.albion-online-data.com',
    west: 'https://west.albion-online-data.com',
    east: 'https://east.albion-online-data.com',
  };
  return servers[serverOverride] || config.baseUrl;
}

/**
 * Enrich a raw price entry with quality label and formatted timestamps.
 */
function enrichPriceEntry(entry) {
  const sellAgeHours = ageHours(entry.sell_price_min_date);
  const buyAgeHours = ageHours(entry.buy_price_max_date);
  return {
    ...entry,
    quality_label: config.qualityLabels[entry.quality] || 'Unknown',
    sell_price_min_date: entry.sell_price_min_date || null,
    buy_price_max_date: entry.buy_price_max_date || null,
    data_quality: {
      sell_age_hours: sellAgeHours,
      buy_age_hours: buyAgeHours,
      sell_status: qualityStatus(entry.sell_price_min, sellAgeHours),
      buy_status: qualityStatus(entry.buy_price_max, buyAgeHours),
      confidence: confidenceScore(entry, sellAgeHours, buyAgeHours),
    },
  };
}

// ─────────────────────────────────────────────
// Prices
// ─────────────────────────────────────────────

/**
 * Fetch current market prices for one or more items.
 *
 * @param {string|string[]} itemIds  - Single ID or array of item IDs (e.g. "T4_BAG" or ["T4_BAG","T4_SWORD"])
 * @param {object}          options
 * @param {string[]}        [options.locations]  - City names array
 * @param {number[]}        [options.qualities]  - Quality numbers (1–5)
 * @param {string}          [options.server]     - 'europe'|'west'|'east'
 * @returns {Promise<object[]>}
 */
async function getPrices(itemIds, options = {}) {
  const inputIds = Array.isArray(itemIds) ? itemIds : String(itemIds).split(',').filter(Boolean);
  const chunks = chunk(inputIds, config.albionApi.maxBatchItems);
  const results = [];
  for (const idsChunk of chunks) {
    const ids = idsChunk.join(',');
    const locations = (options.locations || config.defaultLocations).join(',');
    const baseUrl = resolveBaseUrl(options.server);

    const params = { locations };
    if (options.qualities && options.qualities.length > 0) {
      params.qualities = options.qualities.join(',');
    }

    const key = cacheKey('prices', baseUrl, ids, params);
    const cached = persistentCache.get('prices', key, config.cacheTtl.prices);
    let data;
    let source = 'albion-api';
    let cacheAgeSeconds = 0;
    if (cached) {
      status.cacheHits += 1;
      data = cached.data;
      source = cached.source;
      cacheAgeSeconds = cached.age_seconds;
    } else {
      status.cacheMisses += 1;
      try {
        data = await getWithRetry(`${baseUrl}/api/v2/stats/prices/${ids}.json`, { params });
        persistentCache.set('prices', key, data);
      } catch (err) {
        const stale = persistentCache.get('prices', key, config.cacheTtl.prices, { allowStale: true });
        if (!stale) throw err;
        status.staleFallbacks += 1;
        data = stale.data;
        source = stale.source;
        cacheAgeSeconds = stale.age_seconds;
      }
    }
    results.push(...data.map((entry) => ({ ...enrichPriceEntry(entry), source, cache_age_seconds: cacheAgeSeconds })));
  }
  return results;
}

/**
 * Get prices grouped by city for easier consumption.
 * Returns: { cityName: [ priceEntries ] }
 */
async function getPricesByCity(itemIds, options = {}) {
  const entries = await getPrices(itemIds, options);

  return entries.reduce((acc, entry) => {
    const city = entry.city || 'Unknown';
    if (!acc[city]) acc[city] = [];
    acc[city].push(entry);
    return acc;
  }, {});
}

// ─────────────────────────────────────────────
// History
// ─────────────────────────────────────────────

/**
 * Fetch price history for one or more items.
 *
 * @param {string|string[]} itemIds
 * @param {object}          options
 * @param {string[]}        [options.locations]
 * @param {number[]}        [options.qualities]
 * @param {string}          [options.server]
 * @param {string}          [options.date]      - Start date (YYYY-MM-DD)
 * @param {string}          [options.endDate]   - End date (YYYY-MM-DD)
 * @param {number}          [options.timescale] - 1=hourly, 6=6h, 24=daily
 * @returns {Promise<object[]>}
 */
async function getHistory(itemIds, options = {}) {
  const ids = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;
  const locations = (options.locations || config.defaultLocations).join(',');
  const baseUrl = resolveBaseUrl(options.server);

  const params = { locations };
  if (options.qualities && options.qualities.length > 0) params.qualities = options.qualities.join(',');
  if (options.date) params.date = options.date;
  if (options.endDate) params.end_date = options.endDate;
  if (options.timescale) params.time_scale = options.timescale;

  const key = cacheKey('history', baseUrl, ids, params);
  const cached = persistentCache.get('history', key, config.cacheTtl.history);
  if (cached) {
    status.cacheHits += 1;
    return addHistorySource(cached.data, cached.source, cached.age_seconds);
  }
  status.cacheMisses += 1;
  try {
    const data = await getWithRetry(`${baseUrl}/api/v2/stats/history/${ids}.json`, { params });
    persistentCache.set('history', key, data);
    return addHistorySource(data, 'albion-api', 0);
  } catch (err) {
    const stale = persistentCache.get('history', key, config.cacheTtl.history, { allowStale: true });
    if (!stale) throw err;
    status.staleFallbacks += 1;
    return addHistorySource(stale.data, stale.source, stale.age_seconds);
  }
}

// ─────────────────────────────────────────────
// Gold
// ─────────────────────────────────────────────

/**
 * Fetch gold price history.
 *
 * @param {object} options
 * @param {string} [options.server]
 * @param {string} [options.date]     - Start date (YYYY-MM-DD)
 * @param {string} [options.endDate]  - End date (YYYY-MM-DD)
 * @param {number} [options.count]    - Number of most recent entries
 * @returns {Promise<object[]>}
 */
async function getGoldPrices(options = {}) {
  const baseUrl = resolveBaseUrl(options.server);
  const params = {};

  if (options.date) params.date = options.date;
  if (options.endDate) params.end_date = options.endDate;
  if (options.count) params.count = options.count;

  const key = cacheKey('gold', baseUrl, 'gold', params);
  const cached = persistentCache.get('gold', key, config.cacheTtl.gold);
  if (cached) {
    status.cacheHits += 1;
    return cached.data.map((entry) => ({ ...entry, source: cached.source, cache_age_seconds: cached.age_seconds }));
  }
  status.cacheMisses += 1;
  try {
    const data = await getWithRetry(`${baseUrl}/api/v2/stats/gold.json`, { params });
    persistentCache.set('gold', key, data);
    return data.map((entry) => ({ ...entry, source: 'albion-api', cache_age_seconds: 0 }));
  } catch (err) {
    const stale = persistentCache.get('gold', key, config.cacheTtl.gold, { allowStale: true });
    if (!stale) throw err;
    status.staleFallbacks += 1;
    return stale.data.map((entry) => ({ ...entry, source: stale.source, cache_age_seconds: stale.age_seconds }));
  }
}

async function getWithRetry(url, options) {
  let lastError;
  for (let attempt = 0; attempt <= config.albionApi.retries; attempt += 1) {
    try {
      status.requests += 1;
      if (attempt > 0) status.retries += 1;
      const { data } = await client.get(url, options);
      status.lastSuccessAt = new Date().toISOString();
      return data;
    } catch (err) {
      lastError = err;
      status.failures += 1;
      status.lastFailureAt = new Date().toISOString();
      status.lastError = err.message;
      if (attempt < config.albionApi.retries) await delay(config.albionApi.backoffMs * (attempt + 1));
    }
  }
  throw lastError;
}

function getAlbionStatus() {
  return { ...status, persistent_cache: persistentCache.stats() };
}

function cacheKey(type, baseUrl, ids, params) {
  return JSON.stringify({ type, baseUrl, ids, params });
}

function addHistorySource(data, source, cacheAgeSeconds) {
  return data.map((entry) => ({ ...entry, source, cache_age_seconds: cacheAgeSeconds }));
}

function ageHours(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 36e5));
}

function qualityStatus(price, hours) {
  if (!price || price <= 0) return 'missing';
  if (hours === null) return 'unknown';
  if (hours <= 2) return 'fresh';
  if (hours <= 24) return 'recent';
  if (hours <= 72) return 'stale';
  return 'very_stale';
}

function confidenceScore(entry, sellAge, buyAge) {
  const statuses = [
    qualityStatus(entry.sell_price_min, sellAge),
    qualityStatus(entry.buy_price_max, buyAge),
  ];
  if (statuses.includes('fresh')) return 'high';
  if (statuses.includes('recent')) return 'medium';
  if (statuses.includes('stale')) return 'low';
  return 'none';
}

function summarizePriceQuality(entries) {
  const summary = { total: entries.length, high: 0, medium: 0, low: 0, none: 0, cached: 0 };
  for (const entry of entries) {
    const confidence = entry.data_quality?.confidence || 'none';
    summary[confidence] = (summary[confidence] || 0) + 1;
    if (entry.source === 'persistent-cache') summary.cached += 1;
    if (entry.source === 'persistent-cache-stale') {
      summary.cached += 1;
      summary.stale_fallback = (summary.stale_fallback || 0) + 1;
    }
  }
  return summary;
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { getPrices, getPricesByCity, getHistory, getGoldPrices, getAlbionStatus, summarizePriceQuality };
