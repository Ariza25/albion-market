const axios = require('axios');
const config = require('../../config/config');

const client = axios.create({
  baseURL: config.baseUrl,
  timeout: config.albionApi.timeoutMs,
  headers: {
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

const status = {
  requests: 0,
  failures: 0,
  retries: 0,
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
    america: 'https://west.albion-online-data.com',
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
  const sellPriceMinDate = normalizeAlbionDate(entry.sell_price_min_date);
  const buyPriceMaxDate = normalizeAlbionDate(entry.buy_price_max_date);
  const sellAgeHours = ageHours(sellPriceMinDate);
  const buyAgeHours = ageHours(buyPriceMaxDate);
  return {
    ...entry,
    quality_label: config.qualityLabels[entry.quality] || 'Unknown',
    sell_price_min_date: sellPriceMinDate,
    buy_price_max_date: buyPriceMaxDate,
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
 * @param {string}          [options.server]     - 'america'|'europe'|'east'
 * @returns {Promise<object[]>}
 */
async function getPrices(itemIds, options: any = {}) {
  const inputIds = Array.isArray(itemIds) ? itemIds : String(itemIds).split(',').filter(Boolean);
  const chunks = chunk(inputIds, config.albionApi.maxBatchItems);
  const results = [];
  for (const idsChunk of chunks) {
    const ids = idsChunk.join(',');
    const locations = (options.locations || config.defaultLocations).join(',');
    const baseUrl = resolveBaseUrl(options.server);

    const params: any = { locations };
    if (options.qualities && options.qualities.length > 0) {
      params.qualities = options.qualities.join(',');
    }

    const data = await getWithRetry(`${baseUrl}/api/v2/stats/prices/${ids}.json`, { params });
    results.push(...data.map((entry) => ({ ...enrichPriceEntry(entry), source: 'albion-api', cache_age_seconds: 0 })));
  }
  return annotatePriceAnomalies(results);
}

/**
 * Get prices grouped by city for easier consumption.
 * Returns: { cityName: [ priceEntries ] }
 */
async function getPricesByCity(itemIds, options: any = {}) {
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
async function getHistory(itemIds, options: any = {}) {
  const ids = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;
  const locations = (options.locations || config.defaultLocations).join(',');
  const baseUrl = resolveBaseUrl(options.server);

  const params: any = { locations };
  if (options.qualities && options.qualities.length > 0) params.qualities = options.qualities.join(',');
  if (options.date) params.date = options.date;
  if (options.endDate) params.end_date = options.endDate;
  if (options.timescale) params.time_scale = options.timescale;

  const data = await getWithRetry(`${baseUrl}/api/v2/stats/history/${ids}.json`, { params });
  return addHistorySource(data, 'albion-api', 0);
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
async function getGoldPrices(options: any = {}) {
  const baseUrl = resolveBaseUrl(options.server);
  const params: any = {};

  if (options.date) params.date = options.date;
  if (options.endDate) params.end_date = options.endDate;
  if (options.count) params.count = options.count;

  const data = await getWithRetry(`${baseUrl}/api/v2/stats/gold.json`, { params });
  return data.map((entry) => ({ ...entry, source: 'albion-api', cache_age_seconds: 0 }));
}

async function getWithRetry(url, options) {
  let lastError;
  for (let attempt = 0; attempt <= config.albionApi.retries; attempt += 1) {
    try {
      status.requests += 1;
      if (attempt > 0) status.retries += 1;
      const { data } = await client.get(url, withCacheBuster(options));
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

function withCacheBuster(options: any = {}) {
  return {
    ...options,
    params: {
      ...(options.params || {}),
      _: Date.now(),
    },
  };
}

function getAlbionStatus() {
  return { ...status, cache: 'disabled' };
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

function normalizeAlbionDate(value) {
  if (!value || value.startsWith('0001-01-01')) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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
  if (entry.data_quality?.sell_outlier || entry.data_quality?.buy_outlier) return 'low';
  const statuses = [
    qualityStatus(entry.sell_price_min, sellAge),
    qualityStatus(entry.buy_price_max, buyAge),
  ];
  if (statuses.includes('fresh')) return 'high';
  if (statuses.includes('recent')) return 'medium';
  if (statuses.includes('stale')) return 'low';
  return 'none';
}

function annotatePriceAnomalies(entries) {
  const byItem = new Map();
  for (const entry of entries) {
    if (!byItem.has(entry.item_id)) byItem.set(entry.item_id, []);
    byItem.get(entry.item_id).push(entry);
  }

  for (const itemEntries of byItem.values()) {
    annotateFieldOutliers(itemEntries, 'sell_price_min', 'sell_outlier');
    annotateFieldOutliers(itemEntries, 'buy_price_max', 'buy_outlier');
    for (const entry of itemEntries) {
      if (entry.data_quality?.sell_outlier || entry.data_quality?.buy_outlier) {
        entry.data_quality.confidence = confidenceScore(entry, entry.data_quality.sell_age_hours, entry.data_quality.buy_age_hours);
      }
    }
  }

  return entries;
}

function annotateFieldOutliers(entries, priceField, flagField) {
  const values = entries
    .map((entry) => Number(entry[priceField] || 0))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);

  if (values.length < 4) return;

  const medianValue = median(values);
  const q3Value = quantile(values, 0.75);
  const threshold = Math.max(medianValue * 25, q3Value * 10, 100000);

  for (const entry of entries) {
    const value = Number(entry[priceField] || 0);
    if (value > threshold) {
      entry.data_quality = {
        ...(entry.data_quality || {}),
        [flagField]: true,
        outlier_reason: `Preco ${value} muito acima da mediana ${Math.round(medianValue)} para este item.`,
      };
    }
  }
}

function median(sortedValues) {
  return quantile(sortedValues, 0.5);
}

function quantile(sortedValues, ratio) {
  if (sortedValues.length === 0) return 0;
  const index = (sortedValues.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
}

function summarizePriceQuality(entries) {
  const summary: any = { total: entries.length, high: 0, medium: 0, low: 0, none: 0, suspicious: 0, cached: 0 };
  for (const entry of entries) {
    const confidence = entry.data_quality?.confidence || 'none';
    summary[confidence] = (summary[confidence] || 0) + 1;
    if (entry.data_quality?.sell_outlier || entry.data_quality?.buy_outlier) summary.suspicious += 1;
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

export {};
