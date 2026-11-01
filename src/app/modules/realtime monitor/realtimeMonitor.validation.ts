import { z } from 'zod';

const realtimeRidersQueryZodSchema = z.object({
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional()
    .default({}),
});

const realtimeActivitiesQueryZodSchema = z.object({
  query: z
    .object({
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional()
    .default({}),
});

export const realtimeMonitorValidations = {
  realtimeRidersQueryZodSchema,
  realtimeActivitiesQueryZodSchema,
};
