import { z } from 'zod';

const getNotificationsZodSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    isRead: z.enum(['true', 'false']).optional(),
  }),
});

export const notificationValidation = {
  getNotificationsZodSchema,
};
