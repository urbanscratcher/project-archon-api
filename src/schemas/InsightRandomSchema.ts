import { z } from "zod";

export const InsightRandomSchema = z.object({
  idx: z.number(),
  title: z.string(),
  thumbnail: z.string().optional(),
  summary: z.string(),
});

export const InsightRandomListSchema = z.array(InsightRandomSchema);

export type InsightRandomType = z.infer<typeof InsightRandomSchema>;
export type InsightRandomListType = z.infer<typeof InsightRandomListSchema>;