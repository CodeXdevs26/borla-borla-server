import { z } from 'zod';

const createSavedPlaceZodSchema = z.object({
  body: z.object({
    placeType: z.enum(['home', 'office', 'shop', 'hotel'], {
      message: 'Place type must be one of: home, office, shop, hotel',
    }),
    placeTitle: z
      .string({
        message: 'Place title is required',
      })
      .min(1, 'Place title cannot be empty')
      .max(100, 'Place title is too long'),
    placeName: z
      .string({
        message: 'Place name is required',
      })
      .min(1, 'Place name cannot be empty')
      .max(200, 'Place name is too long'),
    address: z
      .string({
        message: 'Address is required',
      })
      .min(1, 'Address cannot be empty')
      .max(500, 'Address is too long'),
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
  }),
});

const updateSavedPlaceZodSchema = z.object({
  body: z.object({
    placeType: z
      .enum(['home', 'office', 'shop', 'hotel'], {
        message: 'Place type must be one of: home, office, shop, hotel',
      })
      .optional(),
    placeTitle: z
      .string()
      .min(1, 'Place title cannot be empty')
      .max(100, 'Place title is too long')
      .optional(),
    placeName: z
      .string()
      .min(1, 'Place name cannot be empty')
      .max(200, 'Place name is too long')
      .optional(),
    address: z
      .string()
      .min(1, 'Address cannot be empty')
      .max(500, 'Address is too long')
      .optional(),
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
      })
      .optional(),
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
      })
      .optional(),
  }),
});

export const savedPlaceValidation = {
  createSavedPlaceZodSchema,
  updateSavedPlaceZodSchema,
};
