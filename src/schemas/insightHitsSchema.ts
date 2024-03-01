import { z } from 'zod';


export const InsightHitsSchema = z.object({
  insight_idx: z.number(),
  hits: z.bigint().transform((hits) => Number(hits))
})

export type InsightHits = z.infer<typeof InsightHitsSchema>