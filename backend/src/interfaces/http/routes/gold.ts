const express = require('express');
const router = express.Router();

const { cacheMiddleware } = require('../middleware/cache');
const { asyncHandler } = require('../middleware/asyncHandler');
const { validateRequest } = require('../middleware/validateRequest');
const { listGoldHistory } = require('../controllers/goldController');
const { goldQuerySchema } = require('../schemas/goldSchemas');

router.get(
  '/',
  cacheMiddleware('gold'),
  validateRequest({ query: goldQuerySchema }),
  asyncHandler(listGoldHistory),
);

module.exports = router;

export {};
