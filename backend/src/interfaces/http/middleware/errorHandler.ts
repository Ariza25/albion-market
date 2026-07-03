const { AppError } = require('../../../shared/errors/AppError');
const { logger } = require('../../../shared/logger/logger');

function errorHandler(err, req, res, _next) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  logger.error('request_failed', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    error: err.message,
  });

  return res.status(statusCode).json({
    error: err instanceof AppError ? err.message : 'Erro interno do servidor.',
    code,
    details: err instanceof AppError ? err.details : undefined,
  });
}

module.exports = { errorHandler };

export {};
