import { z } from 'zod';
import { optionalEmail, optionalPhone } from '../auth/auth.validation';

const verifyOtpZodSchema = z.object({
  body: z.object({
    otp: z
      .string()
      .nonempty('otp is required')
      .length(4, { message: 'otp must be exactly 4 characters long' }),
  }),
});

const resentOtpZodSchema = z.object({
  body: z
    .object({ email: optionalEmail, phoneNumber: optionalPhone })
    .refine(data => !!(data.email || data.phoneNumber), {
      message: 'Either email or phone number is required',
      path: ['email'],
    }),
});

export const resentOtpValidations = {
  resentOtpZodSchema,
  verifyOtpZodSchema,
};
