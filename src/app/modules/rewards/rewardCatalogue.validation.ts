import { z } from 'zod';

const itemBody = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  esgDimension: z.string().trim().max(120).optional(),
  eligibleRoles: z.array(z.enum(['user', 'institute', 'rider'])).min(1),
  pointsCost: z.coerce.number().int().positive(),
  stockQuantity: z.coerce.number().int().nonnegative(),
  isActive: z.boolean().optional(),
});

export const rewardCatalogueValidations = {
  createItem: z.object({ body: itemBody }),
  updateItem: z.object({ body: itemBody.partial().refine(data => Object.keys(data).length > 0) }),
  reviewClaim: z.object({
    body: z.object({ reviewNote: z.string().trim().max(1000).optional() }),
  }),
};
