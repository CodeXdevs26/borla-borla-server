import { z } from 'zod';

const paymentHistoryZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(['pending', 'success', 'failed', 'refunded']).optional(),
    paymentMethod: z.enum(['hubtel', 'cash']).optional(),
  }),
});

export const paymentValidations = {
  paymentHistoryZodSchema,
};
