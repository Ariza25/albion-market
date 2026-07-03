const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getPrices, summarizePriceQuality } = require('../../../application/services/albionService');
const config = require('../../../config/config');

function parseLocations(locQuery, defaultLocations) {
  if (!locQuery) return defaultLocations;
  return locQuery.split(',').map((l) => l.trim()).filter(Boolean);
}

function parseQualities(qualQuery) {
  if (!qualQuery) return [1];
  return qualQuery.split(',').map(Number).filter((q) => q >= 1 && q <= 5);
}

function parseItems(itemsQuery) {
  if (!itemsQuery) return [];
  return [...new Set(itemsQuery.split(',').map((i) => i.trim().toUpperCase()).filter(Boolean))];
}

router.get('/snapshot', async (req, res) => {
  try {
    const items = parseItems(req.query.items);
    if (items.length === 0) return res.status(400).json({ error: 'items e obrigatorio. Ex: ?items=T4_BAG,T5_BAG' });
    if (items.length > 120) return res.status(400).json({ error: 'Maximo de 120 itens por snapshot.' });

    const locations = parseLocations(req.query.locations, config.defaultLocations);
    const qualities = parseQualities(req.query.qualities);
    const server = req.query.server;
    const generatedAt = new Date().toISOString();
    const prices = await getPrices(items, { locations, qualities, server });
    const snapshotId = crypto.createHash('sha1').update(JSON.stringify({ items, locations, qualities, server, generatedAt })).digest('hex').slice(0, 12);

    return res.json({
      snapshot_id: snapshotId,
      generated_at: generatedAt,
      server: server || config.server,
      items,
      locations,
      qualities,
      prices,
      data_quality: summarizePriceQuality(prices),
    });
  } catch (err) {
    console.error('[market/snapshot]', err.message);
    return res.status(502).json({ error: 'Erro ao gerar snapshot de mercado.', detail: err.message });
  }
});

router.get('/opportunities', async (req, res) => {
  try {
    const items = parseItems(req.query.items);
    if (items.length === 0) return res.status(400).json({ error: 'items e obrigatorio. Ex: ?items=T4_BAG,T5_BAG' });
    if (items.length > 120) return res.status(400).json({ error: 'Maximo de 120 itens por consulta.' });

    const locations = parseLocations(req.query.locations, config.defaultLocations);
    const qualities = parseQualities(req.query.qualities);
    const server = req.query.server;
    const minProfit = Number(req.query.min_profit || 0);
    const prices = await getPrices(items, { locations, qualities, server });
    const opportunities = buildTradeOpportunities(prices, minProfit);

    return res.json({
      generated_at: new Date().toISOString(),
      server: server || config.server,
      items,
      locations,
      qualities,
      opportunities,
      data_quality: summarizePriceQuality(prices),
    });
  } catch (err) {
    console.error('[market/opportunities]', err.message);
    return res.status(502).json({ error: 'Erro ao calcular oportunidades.', detail: err.message });
  }
});

function buildTradeOpportunities(prices, minProfit) {
  const byItemQuality = new Map();
  for (const entry of prices) {
    const key = `${entry.item_id}-${entry.quality}`;
    if (!byItemQuality.has(key)) byItemQuality.set(key, []);
    byItemQuality.get(key).push(entry);
  }

  const rows = [];
  for (const entries of byItemQuality.values()) {
    const buys = entries.filter((entry) => entry.sell_price_min > 0);
    const sells = entries.filter((entry) => entry.buy_price_max > 0 || entry.sell_price_min > 0);
    const cheapest = buys.sort((a, b) => a.sell_price_min - b.sell_price_min)[0];
    const bestSell = sells.sort((a, b) => bestExitPrice(b) - bestExitPrice(a))[0];
    if (!cheapest || !bestSell || cheapest.city === bestSell.city) continue;

    const exitPrice = bestExitPrice(bestSell);
    const netRevenue = Math.round(exitPrice * 0.96);
    const profit = netRevenue - cheapest.sell_price_min;
    if (profit < minProfit) continue;

    rows.push({
      item_id: cheapest.item_id,
      quality: cheapest.quality,
      quality_label: cheapest.quality_label,
      buy_city: cheapest.city,
      sell_city: bestSell.city,
      buy_price: cheapest.sell_price_min,
      sell_price: exitPrice,
      net_revenue: netRevenue,
      profit,
      roi: cheapest.sell_price_min > 0 ? (profit / cheapest.sell_price_min) * 100 : 0,
      confidence: mergeConfidence(cheapest, bestSell),
      buy_age_hours: cheapest.data_quality?.sell_age_hours,
      sell_age_hours: bestSell.data_quality?.buy_age_hours ?? bestSell.data_quality?.sell_age_hours,
    });
  }

  return rows.sort((a, b) => b.profit - a.profit).slice(0, 200);
}

function bestExitPrice(entry) {
  return entry.buy_price_max > 0 ? entry.buy_price_max : entry.sell_price_min;
}

function mergeConfidence(a, b) {
  const ranks = { high: 3, medium: 2, low: 1, none: 0 };
  const score = Math.min(ranks[a.data_quality?.confidence] || 0, ranks[b.data_quality?.confidence] || 0);
  return Object.entries(ranks).find(([, value]) => value === score)?.[0] || 'none';
}

module.exports = router;

export {};
