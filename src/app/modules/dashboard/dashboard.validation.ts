import { z } from 'zod';

const userOverviewQueryZodSchema = z.object({
  query: z
    .object({
      year: z.string().optional(),
      userType: z.enum(['user', 'institute', 'rider']).optional(),
    })
    .optional()
    .default({}),
});

const revenueChartQueryZodSchema = z.object({
  query: z.object({
    period: z.enum(['weekly', 'monthly']),
  }),
});

const zoneComparisonQueryZodSchema = z.object({
  query: z
    .object({
      period: z
        .string()
        .optional()
        .transform(val => (val ? val.toLowerCase() : 'weekly'))
        .refine(val => ['weekly', 'monthly'].includes(val), {
          message: 'Period must be either weekly or monthly',
        }),
    })
    .optional()
    .default({ period: 'weekly' }),
});

const wasteDistributionQueryZodSchema = z.object({
  query: z.object({
    period: z.enum(['weekly', 'monthly']),
  }),
});

const recentAccountsQueryZodSchema = z.object({
  query: z
    .object({
      accountType: z.enum(['user', 'institute', 'rider']).optional(),
      status: z.enum(['Active', 'Inactive']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional()
    .default({}),
});

export const dashboardValidations = {
  userOverviewQueryZodSchema,
  revenueChartQueryZodSchema,
  zoneComparisonQueryZodSchema,
  wasteDistributionQueryZodSchema,
  recentAccountsQueryZodSchema,
};
