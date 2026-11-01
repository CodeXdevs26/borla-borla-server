import { z } from 'zod';

const bookingIdSchema = z
  .string()
  .trim()
  .min(1, 'Please provide booking ID')
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid booking ID format');

const sendMessageZodSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),
  body: z.object({
    text: z
      .string()
      .trim()
      .min(0, 'Message text cannot be empty')
      .max(2000, 'Message text cannot exceed 2000 characters')
      .optional(),
  }),
});

const getMessagesZodSchema = z.object({
  params: z.object({
    bookingId: bookingIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const getChatsZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const chatIdSchema = z
  .string()
  .trim()
  .min(1, 'Please provide chat ID')
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid chat ID format');

const sendSupportMessageZodSchema = z.object({
  body: z.object({
    text: z
      .string()
      .trim()
      .min(0, 'Message text cannot be empty')
      .max(2000, 'Message text cannot exceed 2000 characters')
      .optional(),
  }),
});

const supportMessagesByChatZodSchema = z.object({
  params: z.object({
    chatId: chatIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

const adminSupportChatsZodSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    searchTerm: z.string().trim().min(1).optional(),
  }),
});

const adminReplySupportZodSchema = z.object({
  params: z.object({
    chatId: chatIdSchema,
  }),
  body: z.object({
    text: z
      .string()
      .trim()
      .min(0, 'Message text cannot be empty')
      .max(2000, 'Message text cannot exceed 2000 characters')
      .optional(),
  }),
});

export const messageValidations = {
  sendMessageZodSchema,
  getMessagesZodSchema,
  getChatsZodSchema,
  sendSupportMessageZodSchema,
  supportMessagesByChatZodSchema,
  adminSupportChatsZodSchema,
  adminReplySupportZodSchema,
};
