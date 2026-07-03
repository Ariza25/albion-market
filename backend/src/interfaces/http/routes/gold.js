const express = require('express');
const router = express.Router();
const { getGoldPrices } = require('../../../application/services/albionService');
const { cacheMiddleware } = require('../middleware/cache');

/**
 * @swagger
 * /api/gold:
 *   get:
 *     summary: Preços atuais e histórico do ouro (Gold)
 *     tags: [Gold]
 *     parameters:
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Número das entradas mais recentes a retornar
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *       - in: query
 *         name: server
 *         schema:
 *           type: string
 *           enum: [europe, west, east]
 *           default: europe
 *     responses:
 *       200:
 *         description: Histórico de preços do ouro
 *       502:
 *         description: Erro ao consultar a API do Albion Online
 */
router.get('/', cacheMiddleware('gold'), async (req, res) => {
  try {
    const count = req.query.count ? parseInt(req.query.count, 10) : 24;
    const server = req.query.server;

    const options = {
      count,
      server,
      date: req.query.date,
      endDate: req.query.end_date,
    };

    const data = await getGoldPrices(options);

    // Return latest price and full history
    const latest = data.length > 0 ? data[data.length - 1] : null;
    return res.json({
      latest_price: latest,
      count: data.length,
      history: data,
    });
  } catch (err) {
    console.error('[gold]', err.message);
    return res.status(502).json({ error: 'Erro ao consultar a API do Albion Online.', detail: err.message });
  }
});

module.exports = router;
