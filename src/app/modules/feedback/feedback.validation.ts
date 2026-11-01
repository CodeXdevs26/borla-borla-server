import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID');

const createFeedbackZodSchema = z.object({
  body: z.object({
    receiverId: objectId,
    rating: z.coerce.number().int().min(1).max(5),
    text: z.string().trim().min(1, 'Feedback text is required').max(5000),
  }),
});

const getFeedbackZodSchema = z.object({
  params: z.object({ userId: objectId }),
  query: z
    .object({
      page: z.coerce
        .number()
        .int()
        .positive()
        .max(Number.MAX_SAFE_INTEGER)
        .default(1),
      limit: z.coerce.number().int().positive().max(100).default(10),
    })
    .refine(
      query => Number.isSafeInteger((query.page - 1) * query.limit),
      'Pagination offset is too large',
    ),
});

export const feedbackValidations = {
  createFeedbackZodSchema,
  getFeedbackZodSchema,
};
