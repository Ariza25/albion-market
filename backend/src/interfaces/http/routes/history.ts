const express = require('express');
const router = express.Router();

const { cacheMiddleware } = require('../middleware/cache');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validateRequest } = require('../middleware/validateRequest');
const { showItemHistory } = require('../controllers/historyController');
const { itemParamsSchema, historyQuerySchema } = require('../schemas/historySchemas');

router.get(
  '/:itemId',
  cacheMiddleware('history'),
  validateRequest({ params: itemParamsSchema, query: historyQuerySchema }),
  asyncHandler(showItemHistory),
);

module.exports = router;

export {};
