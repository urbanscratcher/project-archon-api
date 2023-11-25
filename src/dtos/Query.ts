import { z } from 'zod';

export const QueryReqSchema = (baseLimit: number = 10) => z.object({
  offset: z.coerce.number().optional().default(0),
  limit: z.coerce.number().optional().default(baseLimit),
  sorts: z.string().transform(val => JSON.parse(val)).optional(),
  filter: z.string().transform(val => JSON.parse(val)).optional(),
})

export type Filter = {
  field: string,
  operator: 'is' | 'like' | unknown,
  value: string
}