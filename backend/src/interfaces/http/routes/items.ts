const express = require('express');
const router = express.Router();
const { searchItems, getItemById } = require('../../../utils/items');

/**
 * @swagger
 * /api/items/search:
 *   get:
 *     summary: Busca itens por nome ou ID
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo de busca (nome ou ID parcial)
 *         example: bag
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: EN-US
 *         description: Código de idioma para nomes localizados
 *         example: PT-BR
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Número máximo de resultados
 *     responses:
 *       200:
 *         description: Lista de itens encontrados
 *       400:
 *         description: Parâmetro "q" ausente
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'O parâmetro "q" é obrigatório. Ex: ?q=bag' });
    }

    const lang = req.query.lang || 'EN-US';
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const results = await searchItems(query, lang, limit);
    return res.json({ query, lang, count: results.length, items: results });
  } catch (err) {
    console.error('[items/search]', err.message);
    return res.status(500).json({ error: 'Erro ao buscar itens.', detail: err.message });
  }
});

/**
 * @swagger
 * /api/items/{itemId}:
 *   get:
 *     summary: Detalhes de um item pelo seu ID único
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único do item
 *         example: T4_BAG
 *     responses:
 *       200:
 *         description: Detalhes do item
 *       404:
 *         description: Item não encontrado
 */
router.get('/:itemId', async (req, res) => {
  try {
    const item = await getItemById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: `Item "${req.params.itemId}" não encontrado.` });
    }
    return res.json(item);
  } catch (err) {
    console.error('[items/:itemId]', err.message);
    return res.status(500).json({ error: 'Erro ao buscar item.', detail: err.message });
  }
});

module.exports = router;

export {};
