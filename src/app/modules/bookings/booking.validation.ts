import { z } from 'zod';

export const historyPageQuerySchema = z
  .object({
    filter: z.enum(['today', 'weekly', 'monthly', 'all']).default('weekly'),
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
  );

export const acceptedBookingsQuerySchema = z
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
  );

const estimatePriceZodSchema = z.object({
  body: z.object({
    weight: z.coerce.number().finite().positive('Weight must be greater than 0'),
  }),
});

const createBookingZodSchema = z.object({
  body: z.object({
    wasteCategory: z.enum(['organic', 'metal', 'plastic', 'general', 'paper']),
    wasteImages: z.array(z.string()).optional().default([]),
    binSize: z.string().nonempty('Bin size is required'),
    binQuantity: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseInt(val) : val;
        if (isNaN(num)) throw new Error('Invalid bin quantity');
        return num;
      })
      .refine(val => val > 0, 'Bin quantity must be greater than 0'),
    wasteSize: z.coerce.number().finite().positive(),
    pickupLatitude: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) throw new Error('Invalid pickup latitude');
        return num;
      })
      .refine(
        val => val >= -90 && val <= 90,
        'Pickup latitude must be between -90 and 90',
      ),
    pickupLongitude: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) throw new Error('Invalid pickup longitude');
        return num;
      })
      .refine(
        val => val >= -180 && val <= 180,
        'Pickup longitude must be between -180 and 180',
      ),
    pickupAddress: z.string().nonempty('Pickup address is required'),
    dropoffLatitude: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) throw new Error('Invalid dropoff latitude');
        return num;
      })
      .refine(
        val => val >= -90 && val <= 90,
        'Dropoff latitude must be between -90 and 90',
      )
      .optional(),
    dropoffLongitude: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) throw new Error('Invalid dropoff longitude');
        return num;
      })
      .refine(
        val => val >= -180 && val <= 180,
        'Dropoff longitude must be between -180 and 180',
      )
      .optional(),
    dropoffAddress: z.string().optional(),
    vehicleType: z.string().optional(),
    estimatedDistance: z
      .union([z.number(), z.string()])
      .transform(val => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(num)) throw new Error('Invalid estimated distance');
        return num;
      })
      .optional(),
    estimatedTime: z.string().optional(),
    paymentMethod: z.enum(['hubtel', 'cash']),
    neighbours: z
      .preprocess(
        value => {
          if (typeof value !== 'string') return value;
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        },
        z
          .array(
            z.object({
              name: z
                .string()
                .trim()
                .min(1, 'Neighbour name is required')
                .max(100, 'Neighbour name must not exceed 100 characters'),
              amount: z
                .union([z.number(), z.string()])
                .transform(value =>
                  typeof value === 'string' ? Number(value) : value,
                )
                .refine(
                  value => Number.isFinite(value) && value > 0,
                  'Neighbour amount must be greater than 0',
                ),
            }),
          )
          .max(100, 'A booking can contain at most 100 neighbours'),
      )
      .optional()
      .default([]),
    // Scheduling fields
    isScheduled: z
      .union([z.boolean(), z.string()])
      .transform(val => {
        if (typeof val === 'string') {
          return val === 'true' || val === '1';
        }
        return val;
      })
      .optional()
      .default(false),
    scheduledFor: z
      .string()
      .optional()
      .refine(
        val => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: 'Invalid scheduled date format' },
      ),
    scheduledDate: z
      .string()
      .optional()
      .refine(
        val => {
          if (!val) return true;
          // Can be "today", "tomorrow", or any date string
          return true;
        },
        { message: 'Invalid scheduled date value' },
      ),
    // price: z
    //   .union([z.number(), z.string()])
    //   .transform(val => {
    //     const num = typeof val === 'string' ? parseFloat(val) : val;
    //     if (isNaN(num)) throw new Error('Invalid price');
    //     return num;
    //   })
    //   .refine(val => val >= 0, 'Price must be non-negative'),
  }),
});

const updateBookingStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(['accepted', 'in_progress', 'completed', 'cancelled']),
  }),
});

const headingToStationZodSchema = z.object({
  body: z.object({
    stationId: z.string().nonempty('Station ID is required'),
  }),
});

const getBookingsQueryZodSchema = z.object({
  query: z.preprocess(
    val => {
      // Ensure we always have an object with default values
      const query = typeof val === 'object' && val !== null ? val : {};
      return {
        status: (query as any).status || 'pending',
        page: (query as any).page || '1',
        limit: (query as any).limit || '10',
        latitude: (query as any).latitude || undefined,
        longitude: (query as any).longitude || undefined,
        radius: (query as any).radius || '10',
        populateUser: (query as any).populateUser || 'false',
      };
    },
    z.object({
      status: z
        .string()
        .transform(val => {
          if (!val || val.trim() === '') return 'pending';
          return val.trim();
        })
        .refine(
          val =>
            [
              'pending',
              'accepted',
              'ongoing',
              'scheduled',
              'history',
              'arrived_pickup',
              'garbage_ready',
              'garbage_collected',
              'payment_collected',
              'heading_to_station',
              'completed',
              'cancelled',
            ].includes(val),
          {
            message:
              'Status must be one of: pending, accepted, ongoing, scheduled, history, arrived_pickup, garbage_ready, garbage_collected, payment_collected, heading_to_station, completed, cancelled',
          },
        ),
      page: z.string().transform(val => {
        if (!val || val.trim() === '') return 1;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) || parsed < 1 ? 1 : parsed;
      }),
      limit: z.string().transform(val => {
        if (!val || val.trim() === '') return 10;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) || parsed < 1 ? 10 : Math.min(parsed, 100);
      }),
      latitude: z
        .string()
        .optional()
        .transform(val => {
          if (!val || val.trim() === '') return undefined;
          const parsed = parseFloat(val);
          return isNaN(parsed) ? undefined : parsed;
        }),
      longitude: z
        .string()
        .optional()
        .transform(val => {
          if (!val || val.trim() === '') return undefined;
          const parsed = parseFloat(val);
          return isNaN(parsed) ? undefined : parsed;
        }),
      radius: z.string().transform(val => {
        if (!val || val.trim() === '') return 10;
        const parsed = parseFloat(val);
        return isNaN(parsed) || parsed < 1 ? 10 : parsed;
      }),
      populateUser: z
        .string()
        .optional()
        .transform(val => {
          if (!val || val.trim() === '') return false;
          return ['true', '1', 'yes'].includes(val.trim().toLowerCase());
        }),
    }),
  ),
});

const processPaymentZodSchema = z.object({
  body: z.object({
    paymentMethod: z
      .enum(['hubtel', 'cash'])
      .refine(val => val === 'hubtel' || val === 'cash', {
        message: 'Payment method must be either hubtel or cash',
      }),
  }),
});

export const bookingValidations = {
  estimatePriceZodSchema,
  handoverZodSchema: z.object({
    params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid booking ID'),
    }),
  }),
  createBookingZodSchema,
  updateBookingStatusZodSchema,
  getBookingsQueryZodSchema,
  processPaymentZodSchema,
  headingToStationZodSchema,
};
