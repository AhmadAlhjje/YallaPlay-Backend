import { z } from 'zod';

export const PaginationDto = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type PaginationDtoType = z.infer<typeof PaginationDto>;
