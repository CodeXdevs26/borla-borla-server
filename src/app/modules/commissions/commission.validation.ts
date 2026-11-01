import { z } from 'zod';

const commissionRateZodSchema = z.object({
  body: z.object({
    rate: z.coerce
      .number()
      .min(0, { message: 'Commission rate must be at least 0%' })
      .max(100, { message: 'Commission rate cannot exceed 100%' }),
  }),
});

export const commissionValidations = {
  commissionRateZodSchema,
};
