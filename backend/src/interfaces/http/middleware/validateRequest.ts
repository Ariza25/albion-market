const { AppError } = require('../../../shared/errors/AppError');

function validateRequest(schemas = {}) {
  return (req, _res, next) => {
    for (const [key, schema] of Object.entries(schemas as any)) {
      if (!schema) continue;
      const result = (schema as any).safeParse(req[key]);
      if (!result.success) {
        return next(new AppError(400, 'Parametros invalidos.', 'VALIDATION_ERROR', result.error.flatten()));
      }
      req[key] = result.data;
    }

    return next();
  };
}

module.exports = { validateRequest };

export {};
