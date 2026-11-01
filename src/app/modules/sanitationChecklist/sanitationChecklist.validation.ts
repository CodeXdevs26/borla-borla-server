import { z } from 'zod';

const fields = {
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
};
const params = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid checklist ID'),
});
const uploadedIcon = z.custom<Express.Multer.File>(
  file => !!file && typeof (file as Express.Multer.File).path === 'string',
  'Icon file is required',
);
const createSchema = z.object({
  body: z.object(fields).strict(),
  file: uploadedIcon,
});
const updateSchema = z
  .object({
    params,
    body: z.object(fields).partial().strict(),
    file: uploadedIcon.optional(),
  })
  .refine(
    data => Object.keys(data.body).length > 0 || !!data.file,
    'Provide name, description or an icon file to update',
  );
const deleteSchema = z.object({ params });

const progressSchema = z.object({
  params,
  body: z
    .object({
      isCompleted: z
        .union([z.boolean(), z.literal('true'), z.literal('false')])
        .transform(value => value === true || value === 'true'),
    })
    .strict(),
});

export const sanitationChecklistValidations = {
  createSchema,
  updateSchema,
  deleteSchema,
  progressSchema,
};
