import { z } from 'zod';

const referralHistoryQueryZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const referralValidations = {
  referralHistoryQueryZodSchema,
};
