import { z } from 'zod';
export const optionalEmail = z.preprocess(
  value =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  z.string().email('Invalid email format').optional(),
);
export const optionalPhone = z.preprocess(
  value => (typeof value === 'string' ? value.trim() || undefined : value),
  z.string().min(1).optional(),
);

const signupZodSchema = z
  .object({
    files: z.any().optional(),
    body: z
      .object({
        name: z
          .string()
          .nonempty('Name is required')
          .min(2, 'Name must be at least 2 characters'),
        email: optionalEmail,
        phoneNumber: optionalPhone,
        role: z.enum(['user', 'institute', 'rider']).optional(),
        referralCode: z
          .string()
          .trim()
          .min(6, 'Referral code must be at least 6 characters')
          .max(20, 'Referral code must not exceed 20 characters')
          .transform(code => code.toUpperCase())
          .optional(),
        location: z
          .object({
            type: z.literal('Point'),
            coordinates: z
              .array(z.union([z.number(), z.string()]))
              .length(2, 'Coordinates must be an array of two numbers')
              .transform(coords => {
                return coords.map(c => {
                  const num = typeof c === 'string' ? parseFloat(c) : c;
                  if (isNaN(num)) {
                    throw new Error('Coordinates must be valid numbers');
                  }
                  return num;
                });
              }),
          })
          .optional(),
        locationName: z.string().optional(),
        dateOfBirth: z.string().optional(),
        ghanaCardId: z.array(z.string()).optional(), // Array of image URLs
        tricycleLicense: z.array(z.string().min(1)).max(1).optional(),
        sanitationPermit: z.array(z.string().min(1)).max(1).optional(),
        wasteCapacity: z.coerce.number().finite().positive().optional(),
        password: z
          .string()
          .nonempty('Password is required')
          .min(6, 'Password must be at least 6 characters'),
        confirmPassword: z.string().nonempty('Confirm password is required'),
      })
      .refine(data => !!(data.email || data.phoneNumber), {
        message: 'Either email or phone number is required',
        path: ['email'],
      })
      .superRefine((data, ctx) => {
        if (data.role !== 'rider') return;
        for (const field of ['tricycleLicense', 'sanitationPermit'] as const) {
          if (!data[field]?.length) {
            ctx.addIssue({
              code: 'custom',
              path: [field],
              message: `${field} file is required for riders`,
            });
          }
        }
        if (!data.wasteCapacity) {
          ctx.addIssue({
            code: 'custom',
            path: ['wasteCapacity'],
            message: 'Waste capacity in kg is required for riders',
          });
        }
      })
      .refine(data => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword'],
      })
      .refine(
        data => {
          if (data.role === 'rider') {
            return !!data.dateOfBirth;
          }
          return true;
        },
        {
          message: 'Date of Birth is required for riders',
          path: ['dateOfBirth'],
        },
      )
      .refine(
        data => {
          if (data.role === 'rider') {
            return data.ghanaCardId && data.ghanaCardId.length > 0;
          }
          return true;
        },
        {
          message: 'At least one Ghana Card image is required for riders',
          path: ['ghanaCardId'],
        },
      ),
  })
  .superRefine((request, ctx) => {
    if (request.body.role !== 'rider') return;
    // Require real multipart uploads rather than trusting client-supplied URLs.
    const files = (request as { files?: Record<string, unknown[]> }).files;
    for (const field of ['tricycleLicense', 'sanitationPermit']) {
      if (!files?.[field]?.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['body', field],
          message: `${field} must be uploaded as a file`,
        });
      }
    }
  });

const loginZodSchema = z.object({
  body: z
    .object({
      email: optionalEmail,
      phoneNumber: optionalPhone,
      password: z.string().nonempty('Password is required'),
    })
    .refine(data => data.email || data.phoneNumber, {
      message: 'Either email or phone number is required',
      path: ['email'],
    }),
});

const changePasswordZodSchema = z.object({
  body: z
    .object({
      oldPassword: z.string().nonempty('Old password is required'),
      newPassword: z
        .string()
        .nonempty('New password is required')
        .min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string().nonempty('Confirm password is required'),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),
});

const forgotPasswordZodSchema = z.object({
  body: z.object({
    email: z
      .string()
      .nonempty('Email is required')
      .email('Invalid email format'),
  }),
});

const resetPasswordZodSchema = z.object({
  body: z
    .object({
      newPassword: z
        .string()
        .nonempty('New password is required')
        .min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string().nonempty('Confirm password is required'),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),
});

const socialAuthZodSchema = z.object({
  body: z.object({
    email: z
      .string()
      .nonempty('Email is required')
      .email('Invalid email format'),
    name: z.string().nonempty('Name is required'),
    socialId: z.string().nonempty('Social ID is required'),
    provider: z.enum(['google', 'apple']),
    phoneNumber: z.string().optional(),
    profilePicture: z.string().optional(),
  }),
});

export const authValidations = {
  signupZodSchema,
  loginZodSchema,
  changePasswordZodSchema,
  forgotPasswordZodSchema,
  resetPasswordZodSchema,
  socialAuthZodSchema,
};
