import { z } from 'zod';

const updatePageContentZodSchema = z.object({
  body: z.object({
    content: z.string().min(1, 'Content is required'),
  }),
});

export const contentPagesValidation = {
  updatePageContentZodSchema,
};
