const express = require('express');
const router = express.Router();

const { cacheMiddleware } = require('../middleware/cache');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validateRequest } = require('../middleware/validateRequest');
const { showItemPrices, listMultiItemPrices } = require('../controllers/pricesController');
const { itemParamsSchema, itemPricesQuerySchema, multiPricesQuerySchema } = require('../schemas/pricesSchemas');

router.get(
  '/:itemId',
  cacheMiddleware('prices'),
  validateRequest({ params: itemParamsSchema, query: itemPricesQuerySchema }),
  asyncHandler(showItemPrices),
);

router.get(
  '/',
  cacheMiddleware('prices'),
  validateRequest({ query: multiPricesQuerySchema }),
  asyncHandler(listMultiItemPrices),
);

module.exports = router;

export {};
