import { z } from 'zod';

const updateVerificationStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(['verified', 'rejected'], {
      message: 'Status is required',
    }),
  }),
});

const getRidersQueryZodSchema = z.object({
  query: z
    .object({
      status: z.enum(['pending', 'verified', 'rejected']).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      searchTerm: z.string().optional(),
    })
    .optional()
    .default({}),
});

const approveRiderZodSchema = z.object({
  body: z.object({
    zoneId: z
      .string({
        message: 'Zone ID is required to approve rider',
      })
      .min(1, 'cannot be empty'),
  }),
});

export const riderVerificationValidations = {
  updateVerificationStatusZodSchema,
  getRidersQueryZodSchema,
  approveRiderZodSchema,
};
