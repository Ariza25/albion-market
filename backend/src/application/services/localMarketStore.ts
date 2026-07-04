const config = require('../../config/config');

const CITY_ALIASES = new Map([
  ['BLACKMARKET', 'Black Market'],
  ['BLACK_MARKET', 'Black Market'],
  ['BLACK MARKET', 'Black Market'],
  ['CAERLEON', 'Caerleon'],
  ['BRIDGEWATCH', 'Bridgewatch'],
  ['LYMHURST', 'Lymhurst'],
  ['FORTSTERLING', 'Fort Sterling'],
  ['FORT_STERLING', 'Fort Sterling'],
  ['FORT STERLING', 'Fort Sterling'],
  ['THETFORD', 'Thetford'],
  ['MARTLOCK', 'Martlock'],
  ['BRECILIEN', 'Brecilien'],
]);

const orderBook = new Map();
const stats = {
  receivedMessages: 0,
  receivedOrders: 0,
  storedOrders: 0,
  lastMessageAt: null,
  lastOrderAt: null,
  lastError: null,
};

function ingestMarketMessage(message) {
  stats.receivedMessages += 1;
  stats.lastMessageAt = new Date().toISOString();
  const orders = extractOrders(message);
  for (const order of orders) ingestMarketOrder(order);
  return orders.length;
}

function ingestMarketOrder(order) {
  const normalized = normalizeOrder(order);
  if (!normalized) return false;
  const key = orderKey(normalized);
  orderBook.set(key, normalized);
  stats.receivedOrders += 1;
  stats.storedOrders = orderBook.size;
  stats.lastOrderAt = new Date().toISOString();
  return true;
}

function getLocalPriceEntries(itemIds, options: any = {}) {
  pruneOldOrders();
  const itemSet = new Set((Array.isArray(itemIds) ? itemIds : String(itemIds).split(',')).map((item) => item.toUpperCase()));
  const locationSet = new Set((options.locations || config.defaultLocations).map(normalizeCity).filter(Boolean));
  const qualitySet = new Set(options.qualities && options.qualities.length > 0 ? options.qualities.map(Number) : [1]);
  const groups = new Map();

  for (const order of orderBook.values()) {
    if (!itemSet.has(order.item_id)) continue;
    if (!locationSet.has(order.city)) continue;
    if (!qualitySet.has(order.quality)) continue;
    const key = `${order.item_id}|${order.city}|${order.quality}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(order);
  }

  return [...groups.values()].map(toPriceEntry);
}

function mergeLocalPrices(restPrices, localPrices) {
  const byKey = new Map(restPrices.map((entry) => [priceKey(entry), entry]));
  for (const local of localPrices) {
    const key = priceKey(local);
    const current: any = byKey.get(key) || {};
    byKey.set(key, {
      ...current,
      ...local,
      source: 'albion-nats',
      cache_age_seconds: 0,
      data_quality: {
        ...(current.data_quality || {}),
        ...(local.data_quality || {}),
        confidence: 'high',
      },
    });
  }
  return [...byKey.values()];
}

function getLocalMarketStats() {
  pruneOldOrders();
  return {
    ...stats,
    storedOrders: orderBook.size,
    maxAgeSeconds: config.albionNats.maxAgeSeconds,
  };
}

function extractOrders(message) {
  if (Array.isArray(message)) return message;
  if (Array.isArray(message?.Orders)) return message.Orders;
  if (Array.isArray(message?.orders)) return message.orders;
  if (message?.ItemTypeId || message?.item_id) return [message];
  return [];
}

function normalizeOrder(order) {
  const itemBase = String(order.ItemTypeId || order.item_id || order.itemId || '').toUpperCase();
  const enchantment = Number(order.EnchantmentLevel ?? order.enchantment ?? 0);
  const itemId = normalizeItemId(itemBase, enchantment);
  const city = normalizeCity(order.LocationId || order.location || order.city);
  const quality = Number(order.QualityLevel ?? order.quality ?? 1);
  const price = Number(order.UnitPriceSilver ?? order.price ?? 0);
  const amount = Number(order.Amount ?? order.amount ?? 0);
  const auctionType = String(order.AuctionType || order.auction_type || '').toLowerCase();
  const orderId = String(order.Id || order.id || `${itemId}-${city}-${quality}-${price}-${auctionType}`);
  const seenAt = new Date().toISOString();

  if (!itemId || !city || quality < 1 || quality > 5 || price <= 0) return null;

  return {
    id: orderId,
    item_id: itemId,
    city,
    quality,
    quality_label: config.qualityLabels[quality] || 'Unknown',
    price,
    amount,
    side: normalizeSide(auctionType),
    seen_at: seenAt,
    raw_auction_type: auctionType,
  };
}

function normalizeItemId(itemId, enchantment) {
  if (!itemId) return null;
  if (itemId.includes('@')) return itemId;
  return enchantment > 0 ? `${itemId}@${enchantment}` : itemId;
}

function normalizeCity(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const compact = raw.toUpperCase().replace(/[-\s]/g, '_');
  return CITY_ALIASES.get(compact) || CITY_ALIASES.get(raw.toUpperCase()) || raw;
}

function normalizeSide(auctionType) {
  if (auctionType.includes('request') || auctionType.includes('buy')) return 'buy';
  return 'sell';
}

function orderKey(order) {
  return `${order.id}|${order.item_id}|${order.city}|${order.quality}|${order.side}`;
}

function priceKey(entry) {
  return `${entry.item_id}|${entry.city}|${entry.quality}`;
}

function toPriceEntry(orders) {
  const sample = orders[0];
  const sellOrders = orders.filter((order) => order.side === 'sell');
  const buyOrders = orders.filter((order) => order.side === 'buy');
  const sellPrices = sellOrders.map((order) => order.price);
  const buyPrices = buyOrders.map((order) => order.price);
  const sellSeenAt = newestDate(sellOrders);
  const buySeenAt = newestDate(buyOrders);

  return {
    item_id: sample.item_id,
    city: sample.city,
    quality: sample.quality,
    quality_label: sample.quality_label,
    sell_price_min: sellPrices.length ? Math.min(...sellPrices) : 0,
    sell_price_min_date: sellSeenAt,
    sell_price_max: sellPrices.length ? Math.max(...sellPrices) : 0,
    sell_price_max_date: sellSeenAt,
    buy_price_min: buyPrices.length ? Math.min(...buyPrices) : 0,
    buy_price_min_date: buySeenAt,
    buy_price_max: buyPrices.length ? Math.max(...buyPrices) : 0,
    buy_price_max_date: buySeenAt,
    source: 'albion-nats',
    cache_age_seconds: 0,
    data_quality: {
      sell_age_hours: sellSeenAt ? ageHours(sellSeenAt) : null,
      buy_age_hours: buySeenAt ? ageHours(buySeenAt) : null,
      sell_status: sellSeenAt ? 'fresh' : 'missing',
      buy_status: buySeenAt ? 'fresh' : 'missing',
      confidence: 'high',
    },
  };
}

function newestDate(orders) {
  if (orders.length === 0) return null;
  return orders.reduce((newest, order) => (order.seen_at > newest ? order.seen_at : newest), orders[0].seen_at);
}

function ageHours(value) {
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 36e5));
}

function pruneOldOrders() {
  const maxAgeMs = config.albionNats.maxAgeSeconds * 1000;
  const now = Date.now();
  for (const [key, order] of orderBook.entries()) {
    if (now - new Date(order.seen_at).getTime() > maxAgeMs) orderBook.delete(key);
  }
}

module.exports = {
  ingestMarketMessage,
  getLocalPriceEntries,
  mergeLocalPrices,
  getLocalMarketStats,
};

export {};
