const express = require('express');
const router = express.Router();
const { getHistory } = require('../../../application/services/albionService');
const { analyzeHistory } = require('../../../application/services/historyAnalytics');
const { cacheMiddleware } = require('../middleware/cache');
const config = require('../../../config/config');

function parseLocations(locQuery, defaultLocations) {
  if (!locQuery) return defaultLocations;
  return locQuery.split(',').map((l) => l.trim()).filter(Boolean);
}

function parseQualities(qualQuery) {
  if (!qualQuery) return [];
  return qualQuery.split(',').map(Number).filter((q) => q >= 1 && q <= 5);
}

/**
 * @swagger
 * /api/history/{itemId}:
 *   get:
 *     summary: Histórico de preços de um item
 *     tags: [History]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do item
 *         example: T4_BAG
 *       - in: query
 *         name: locations
 *         schema:
 *           type: string
 *         description: Cidades separadas por vírgula
 *       - in: query
 *         name: qualities
 *         schema:
 *           type: string
 *         description: Qualidades (1-5)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *         example: "2024-01-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *       - in: query
 *         name: time_scale
 *         schema:
 *           type: integer
 *           enum: [1, 6, 24]
 *           default: 24
 *         description: Escala de tempo em horas (1=hora, 6=6h, 24=diário)
 *       - in: query
 *         name: server
 *         schema:
 *           type: string
 *           enum: [europe, west, east]
 *     responses:
 *       200:
 *         description: Histórico de preços do item
 *       400:
 *         description: Parâmetros inválidos
 *       502:
 *         description: Erro ao consultar a API do Albion Online
 */
router.get('/:itemId', cacheMiddleware('history'), async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!itemId) return res.status(400).json({ error: 'itemId é obrigatório.' });

    const locations = parseLocations(req.query.locations, config.defaultLocations);
    const qualities = parseQualities(req.query.qualities);
    const timescale = req.query.time_scale ? parseInt(req.query.time_scale, 10) : 24;
    const server = req.query.server;

    const options = {
      locations,
      qualities,
      timescale,
      server,
      date: req.query.date,
      endDate: req.query.end_date,
    };

    const data = await getHistory(itemId.toUpperCase(), options);
    const metrics = analyzeHistory(data);
    return res.json({
      item_id: itemId.toUpperCase(),
      history: data,
      metrics,
      metrics_source: 'Albion Data history, IQR outlier filter, weighted averages by item_count',
    });
  } catch (err) {
    console.error('[history/:itemId]', err.message);
    return res.status(502).json({ error: 'Erro ao consultar a API do Albion Online.', detail: err.message });
  }
});

module.exports = router;
