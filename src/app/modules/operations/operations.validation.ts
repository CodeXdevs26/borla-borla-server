import { z } from 'zod';

const dashboardQueryZodSchema = z.object({
  query: z
    .object({
      period: z.enum(['daily', 'weekly', 'monthly']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      zoneId: z.string().optional(),
    })
    .optional()
    .default({}),
});

const rankingQueryZodSchema = z.object({
  query: z
    .object({
      period: z.enum(['daily', 'weekly', 'monthly']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.string().optional(), // Keep as string, converted to number in service
    })
    .optional()
    .default({}),
});

const pickupSuccessRateZodSchema = z.object({
  params: z
    .object({
      zoneId: z.string().min(1, 'Zone ID is required').optional(),
    })
    .optional()
    .default({}),
  query: z
    .object({
      period: z.enum(['weekly', 'monthly', 'yearly', 'all-time']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      zoneId: z.string().optional(),
    })
    .optional()
    .default({}),
});

const zoneTopPerformingRidersZodSchema = z.object({
  params: z.object({
    zoneId: z.string().min(1, 'Zone ID is required'),
  }),
  query: z
    .object({
      period: z.enum(['daily', 'weekly', 'monthly']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional()
    .default({}),
});

const zoneQueryZodSchema = z.object({
  params: z.object({
    zoneId: z.string().min(1, 'Zone ID is required'),
  }),
  query: z
    .object({
      period: z.enum(['daily', 'weekly', 'monthly']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional()
    .default({}),
});

const riderListQueryZodSchema = z.object({
  query: z
    .object({
      search: z.string().optional(),
      zoneId: z.string().optional(),
      status: z.enum(['Online', 'Offline', 'Busy']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional()
    .default({}),
});

export const operationsValidations = {
  dashboardQueryZodSchema,
  rankingQueryZodSchema,
  pickupSuccessRateZodSchema,
  zoneTopPerformingRidersZodSchema,
  zoneQueryZodSchema,
  riderListQueryZodSchema,
};
