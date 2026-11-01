import { z } from 'zod';

const updateLocationZodSchema = z.object({
  body: z.object({
    latitude: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) {
          throw new Error('Invalid latitude value');
        }
        return num;
      })
      .refine(val => val >= -90 && val <= 90, {
        message: 'Latitude must be between -90 and 90',
      }),
    longitude: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) {
          throw new Error('Invalid longitude value');
        }
        return num;
      })
      .refine(val => val >= -180 && val <= 180, {
        message: 'Longitude must be between -180 and 180',
      }),
    locationName: z
      .string()
      .min(1, 'Location name cannot be empty')
      .max(200, 'Location name is too long')
      .optional(),
  }),
});

export const userValidation = {
  updateLocationZodSchema,
};
