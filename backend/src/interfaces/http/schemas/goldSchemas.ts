const { z } = require('zod');

const goldQuerySchema = z.object({
  count: z.preprocess((value) => (value ? Number(value) : 24), z.number().int().min(1).max(500)),
  date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
  server: z.enum(['america', 'europe', 'east', 'west']).optional(),
});

module.exports = { goldQuerySchema };

export {};
