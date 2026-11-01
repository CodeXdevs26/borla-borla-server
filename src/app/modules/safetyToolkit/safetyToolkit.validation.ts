import { z } from 'zod';

const fields = {
  title: z.string().trim().min(1).max(200),
  items: z.array(z.string().trim().min(1).max(2000)).min(1).max(100),
};
const params = z.object({
  sectionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid section ID'),
});
const createSchema = z.object({ body: z.object(fields).strict() });
const updateSchema = z.object({
  params,
  body: z
    .object(fields)
    .partial()
    .strict()
    .refine(
      body => Object.keys(body).length > 0,
      'Provide title or items to update',
    ),
});
const deleteSchema = z.object({ params });
export const safetyToolkitValidations = {
  createSchema,
  updateSchema,
  deleteSchema,
};
