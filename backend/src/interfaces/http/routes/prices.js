const express = require('express');
const router = express.Router();
const { getPrices, getPricesByCity, summarizePriceQuality } = require('../../../application/services/albionService');
const { cacheMiddleware } = require('../middleware/cache');
const config = require('../../../config/config');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function parseLocations(locQuery, defaultLocations) {
  if (!locQuery) return defaultLocations;
  return locQuery.split(',').map((l) => l.trim()).filter(Boolean);
}

function parseQualities(qualQuery) {
  if (!qualQuery) return [];
  return qualQuery.split(',').map(Number).filter((q) => q >= 1 && q <= 5);
}

function parseItems(itemsQuery) {
  if (!itemsQuery) return [];
  return itemsQuery.split(',').map((i) => i.trim().toUpperCase()).filter(Boolean);
}

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

/**
 * @swagger
 * /api/prices/{itemId}:
 *   get:
 *     summary: Preços de um item em todas as cidades principais
 *     tags: [Prices]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: "ID único do item (ex: T4_BAG, T5_MAIN_SWORD)"
 *         example: T4_BAG
 *       - in: query
 *         name: locations
 *         schema:
 *           type: string
 *         description: Cidades separadas por vírgula
 *         example: Caerleon,Thetford
 *       - in: query
 *         name: qualities
 *         schema:
 *           type: string
 *         description: Qualidades (1-5) separadas por vírgula
 *         example: 1,2
 *       - in: query
 *         name: groupByCity
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Agrupa resultado por cidade
 *       - in: query
 *         name: server
 *         schema:
 *           type: string
 *           enum: [europe, west, east]
 *           default: europe
 *         description: Servidor do jogo
 *     responses:
 *       200:
 *         description: Lista de preços por cidade
 *       400:
 *         description: Item ID inválido
 *       502:
 *         description: Erro ao consultar a API do Albion Online
 */
router.get('/:itemId', cacheMiddleware('prices'), async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!itemId) return res.status(400).json({ error: 'itemId é obrigatório.' });

    const locations = parseLocations(req.query.locations, config.defaultLocations);
    const qualities = parseQualities(req.query.qualities);
    const groupByCity = req.query.groupByCity === 'true';
    const server = req.query.server;

    const options = { locations, qualities, server };

    if (groupByCity) {
      const data = await getPricesByCity(itemId.toUpperCase(), options);
      const flat = Object.values(data).flat();
      return res.json({ item_id: itemId.toUpperCase(), grouped_by_city: data, data_quality: summarizePriceQuality(flat) });
    }

    const data = await getPrices(itemId.toUpperCase(), options);
    return res.json({ item_id: itemId.toUpperCase(), prices: data, data_quality: summarizePriceQuality(data) });
  } catch (err) {
    console.error('[prices/:itemId]', err.message);
    return res.status(502).json({ error: 'Erro ao consultar a API do Albion Online.', detail: err.message });
  }
});

/**
 * @swagger
 * /api/prices:
 *   get:
 *     summary: Preços de múltiplos itens
 *     tags: [Prices]
 *     parameters:
 *       - in: query
 *         name: items
 *         required: true
 *         schema:
 *           type: string
 *         description: IDs separados por vírgula (máx. 20)
 *         example: T4_BAG,T4_MAIN_SWORD
 *       - in: query
 *         name: locations
 *         schema:
 *           type: string
 *         description: Cidades separadas por vírgula
 *       - in: query
 *         name: qualities
 *         schema:
 *           type: string
 *         description: Qualidades (1-5) separadas por vírgula
 *       - in: query
 *         name: server
 *         schema:
 *           type: string
 *           enum: [europe, west, east]
 *     responses:
 *       200:
 *         description: Preços dos itens solicitados
 *       400:
 *         description: Parâmetro "items" ausente ou inválido
 *       502:
 *         description: Erro ao consultar a API do Albion Online
 */
router.get('/', cacheMiddleware('prices'), async (req, res) => {
  try {
    const items = parseItems(req.query.items);
    if (items.length === 0) {
      return res.status(400).json({ error: 'O parâmetro "items" é obrigatório. Ex: ?items=T4_BAG,T4_SWORD' });
    }
    if (items.length > 20) {
      return res.status(400).json({ error: 'Máximo de 20 itens por requisição.' });
    }

    const locations = parseLocations(req.query.locations, config.defaultLocations);
    const qualities = parseQualities(req.query.qualities);
    const server = req.query.server;

    const data = await getPrices(items, { locations, qualities, server });
    return res.json({ items, prices: data, data_quality: summarizePriceQuality(data) });
  } catch (err) {
    console.error('[prices]', err.message);
    return res.status(502).json({ error: 'Erro ao consultar a API do Albion Online.', detail: err.message });
  }
});

module.exports = router;
