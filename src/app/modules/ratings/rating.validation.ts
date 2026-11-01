import { z } from 'zod';

const createRatingZodSchema = z.object({
  body: z.object({
    bookingId: z.string().nonempty('Booking ID is required'),
    rating: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseInt(val) : val;
        if (isNaN(num)) throw new Error('Invalid rating');
        return num;
      })
      .refine(val => val >= 1 && val <= 5, 'Rating must be between 1 and 5'),
    feedback: z.string().optional(),
  }),
});

const updateRatingZodSchema = z.object({
  body: z.object({
    rating: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseInt(val) : val;
        if (isNaN(num)) throw new Error('Invalid rating');
        return num;
      })
      .refine(val => val >= 1 && val <= 5, 'Rating must be between 1 and 5')
      .optional(),
    feedback: z.string().optional(),
  }),
});

export const ratingValidations = {
  createRatingZodSchema,
  updateRatingZodSchema,
};
