const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const config = require('./config/config');
const { getCacheStats, flushAll } = require('./interfaces/http/middleware/cache');
const { getAlbionStatus } = require('./application/services/albionService');
const { AppError } = require('./shared/errors/AppError');
const { logger } = require('./shared/logger/logger');
const { errorHandler } = require('./interfaces/http/middleware/errorHandler');

const pricesRouter = require('./interfaces/http/routes/prices');
const historyRouter = require('./interfaces/http/routes/history');
const goldRouter = require('./interfaces/http/routes/gold');
const itemsRouter = require('./interfaces/http/routes/items');
const craftingRouter = require('./interfaces/http/routes/crafting');
const marketRouter = require('./interfaces/http/routes/market');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info('request_received', { method: req.method, path: req.originalUrl });
  next();
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Albion Market API',
      version: '1.0.0',
      description:
        'Backend que consome a Albion Online Data Project API e expoe precos de itens nas principais cidades do jogo.',
      contact: { name: 'Albion Market' },
    },
    servers: [{ url: `http://localhost:${config.port}`, description: 'Servidor local' }],
    tags: [
      { name: 'Prices', description: 'Precos atuais de itens por cidade' },
      { name: 'History', description: 'Historico de precos' },
      { name: 'Gold', description: 'Precos do ouro' },
      { name: 'Items', description: 'Catalogo e busca de itens' },
      { name: 'Crafting', description: 'Receitas reais e dados de craft' },
      { name: 'Market', description: 'Snapshots e oportunidades de mercado' },
      { name: 'System', description: 'Health check e informacoes do servico' },
    ],
  },
  apis: [path.join(__dirname, 'interfaces/http/routes/*.{js,ts}')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

app.use('/api/prices', pricesRouter);
app.use('/api/history', historyRouter);
app.use('/api/gold', goldRouter);
app.use('/api/items', itemsRouter);
app.use('/api/crafting', craftingRouter);
app.use('/api/market', marketRouter);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check e estatisticas do servico
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Servico online
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime_seconds: Math.floor(process.uptime()),
    server: config.server,
    base_url: config.baseUrl,
    default_locations: config.defaultLocations,
    cache: getCacheStats(),
    albion_data: getAlbionStatus(),
  });
});

/**
 * @swagger
 * /cache/flush:
 *   post:
 *     summary: Limpa todos os caches do servidor
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Cache limpo com sucesso
 */
app.post('/cache/flush', (_req, res) => {
  flushAll();
  logger.info('cache_flushed');
  res.json({ message: 'Cache limpo com sucesso.' });
});

/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: Lista as cidades disponiveis para consulta
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Lista de cidades
 */
app.get('/api/cities', (_req, res) => {
  res.json({
    main_cities: config.mainCities,
    all_locations: config.allLocations,
    default_locations: config.defaultLocations,
  });
});

app.use((_req, res) => {
  throw new AppError(404, 'Rota nao encontrada.', 'NOT_FOUND');
});

app.use(errorHandler);

module.exports = app;

export {};
