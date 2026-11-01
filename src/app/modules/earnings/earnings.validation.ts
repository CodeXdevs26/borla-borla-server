import { z } from 'zod';

const earningsListZodSchema = z.object({
  query: z
    .object({
      search: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional()
    .default({}),
});

const earningDetailsZodSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Transaction id is required'),
  }),
});

const riderEarningsZodSchema = z.object({
  query: z
    .object({
      filter: z.enum(['today', 'weekly', 'monthly']).default('monthly'),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional()
    .default({ filter: 'monthly' }),
});

const riderEarningDetailsZodSchema = z.object({
  query: z.object({
    filter: z.enum(['today', 'weekly', 'monthly']).default('today'),
  }),
});

export const earningsValidations = {
  earningsListZodSchema,
  earningDetailsZodSchema,
  riderEarningsZodSchema,
  riderEarningDetailsZodSchema,
};
