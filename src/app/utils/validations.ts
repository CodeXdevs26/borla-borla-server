import { z } from 'zod';

export const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid MongoDB ObjectId',
});
