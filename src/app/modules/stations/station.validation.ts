import { z } from 'zod';

const createStationZodSchema = z.object({
  body: z.object({
    zoneId: z.string().min(1, 'Zone ID is required'),
    name: z.string().min(1, 'Station name is required'),
    address: z.string().min(1, 'Station address is required'),
    location: z.object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]), // [longitude, latitude]
    }),
  }),
});

const updateStationZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    location: z
      .object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()]),
      })
      .optional(),
  }),
});

export const stationValidations = {
  createStationZodSchema,
  updateStationZodSchema,
};
