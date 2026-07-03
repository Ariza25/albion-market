const { z } = require('zod');
const config = require('../../../config/config');

const serverSchema = z.enum(['america', 'europe', 'east', 'west']).optional();

const commaList = (fallback = []) =>
  z.preprocess((value) => {
    if (!value) return fallback;
    if (Array.isArray(value)) return value.flatMap((entry) => String(entry).split(','));
    return String(value).split(',');
  }, z.array(z.string().trim().min(1)).transform((items) => items.filter(Boolean)));

const qualitiesSchema = z.preprocess((value) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value.flatMap((entry) => String(entry).split(',')) : String(value).split(',');
  return raw.map(Number).filter((quality) => quality >= 1 && quality <= 5);
}, z.array(z.number().int().min(1).max(5)));

const itemParamsSchema = z.object({
  itemId: z.string().trim().min(1).transform((value) => value.toUpperCase()),
});

const itemPricesQuerySchema = z.object({
  locations: commaList(config.defaultLocations),
  qualities: qualitiesSchema,
  groupByCity: z.preprocess((value) => value === 'true' || value === true, z.boolean()).optional().default(false),
  server: serverSchema,
});

const multiPricesQuerySchema = z.object({
  items: commaList([]).refine((items) => items.length > 0, 'items e obrigatorio').refine((items) => items.length <= 20, 'Maximo de 20 itens por requisicao'),
  locations: commaList(config.defaultLocations),
  qualities: qualitiesSchema,
  server: serverSchema,
});

module.exports = { itemParamsSchema, itemPricesQuerySchema, multiPricesQuerySchema };

export {};
