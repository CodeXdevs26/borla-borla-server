import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid emergency support ID');

const locationSchema = z.preprocess(
  value => {
    if (typeof value !== 'string') return value;

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },
  z.object({
    type: z.literal('Point'),
    coordinates: z
      .array(z.coerce.number())
      .length(2, 'Coordinates must contain longitude and latitude')
      .refine(
        ([longitude, latitude]) =>
          longitude >= -180 &&
          longitude <= 180 &&
          latitude >= -90 &&
          latitude <= 90,
        'Coordinates are outside the valid longitude/latitude range',
      )
      .transform(coordinates => coordinates as [number, number]),
  }),
);

const createEmergencySupportZodSchema = z.object({
  body: z.object({
    location: locationSchema,
    phoneNumber: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9 ()-]{5,19}$/, 'Invalid phone number')
      .optional(),
    locationAddress: z.string().trim().max(500).optional(),
    description: z.string().trim().min(10).max(5000),
  }),
  files: z
    .array(z.any())
    .min(1, 'At least one incident photo is required')
    .max(5),
});

const getEmergencySupportsZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(['pending', 'resolved']).optional(),
  }),
});

const updateEmergencySupportStatusZodSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ status: z.enum(['pending', 'resolved']) }),
});

export const emergencySupportValidations = {
  createEmergencySupportZodSchema,
  getEmergencySupportsZodSchema,
  updateEmergencySupportStatusZodSchema,
};
