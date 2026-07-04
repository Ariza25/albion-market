const express = require('express');
const router = express.Router();

const { asyncHandler } = require('../middleware/asyncHandler');
const { validateRequest } = require('../middleware/validateRequest');
const { showItemPrices, listMultiItemPrices } = require('../controllers/pricesController');
const { itemParamsSchema, itemPricesQuerySchema, multiPricesQuerySchema } = require('../schemas/pricesSchemas');

router.get(
  '/:itemId',
  validateRequest({ params: itemParamsSchema, query: itemPricesQuerySchema }),
  asyncHandler(showItemPrices),
);

router.get(
  '/',
  validateRequest({ query: multiPricesQuerySchema }),
  asyncHandler(listMultiItemPrices),
);

module.exports = router;

export {};
