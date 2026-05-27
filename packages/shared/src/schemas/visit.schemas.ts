import { z } from 'zod';

export const createVisitSchema = z.object({
  shopId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photoUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
