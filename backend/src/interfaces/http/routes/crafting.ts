const express = require('express');
const router = express.Router();
const { getRecipe } = require('../../../application/services/craftingService');
const { cacheMiddleware } = require('../middleware/cache');

/**
 * @swagger
 * /api/crafting/recipe/{itemId}:
 *   get:
 *     summary: Receita real de craft extraida do dump bruto do Albion
 *     tags: [Crafting]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID unico do item
 *         example: T4_2H_BOW_HELL
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           default: PT-BR
 *         description: Idioma dos nomes localizados
 *     responses:
 *       200:
 *         description: Receita de craft do item
 *       404:
 *         description: Receita nao encontrada
 */
router.get('/recipe/:itemId', cacheMiddleware('crafting'), async (req, res) => {
  try {
    const recipe = await getRecipe(req.params.itemId, req.query.lang || 'PT-BR');
    if (!recipe) {
      return res.status(404).json({ error: `Receita de "${req.params.itemId}" nao encontrada.` });
    }
    return res.json(recipe);
  } catch (err) {
    console.error('[crafting/recipe/:itemId]', err.message);
    return res.status(502).json({ error: 'Erro ao carregar receita de craft.', detail: err.message });
  }
});

module.exports = router;

export {};
