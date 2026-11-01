import { z } from 'zod';
import { SPECIAL_ACCESS_TYPES } from './specialAccess.interface';

const createSpecialAccessUserZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(120),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phoneNumber: z.string().min(6).max(25).optional(),
    accountType: z.enum(SPECIAL_ACCESS_TYPES),
  }),
});

const getSpecialAccessUsersZodSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    searchTerm: z.string().optional(),
    accountType: z.enum(SPECIAL_ACCESS_TYPES).optional(),
  }),
});

export const specialAccessValidation = {
  createSpecialAccessUserZodSchema,
  getSpecialAccessUsersZodSchema,
};
