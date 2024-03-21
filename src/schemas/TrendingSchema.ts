
import { formatISO } from 'date-fns';
import { z } from "zod";

export const TrendingInsightSchema = z.object({
  idx: z.number(),
  hits: z.bigint().transform((hits) => Number(hits)),
  title: z.string(),
  thumbnail: z.string().optional(),
  summary: z.string(),
  topic_idx: z.number(),
  topic_name: z.string(),
  created_at: z.coerce.date().transform((c) => formatISO(c))
  ,
  created_by: z.number(),
  created_first_name: z.string(),
  created_last_name: z.string(),
  avatar: z.string().nullable().transform((a) => a || undefined),
  edited_at: z.date().nullable().transform((editedAt) => editedAt ? formatISO(editedAt) : undefined)
}).transform((data) => {
  return {
    idx: data.idx,
    hits: data.hits,
    title: data.title,
    thumbnail: data.thumbnail,
    summary: data.summary,
    topic: {
      idx: data.topic_idx,
      name: data.topic_name
    },
    creator: {
      idx: data.created_by,
      first_name: data.created_first_name,
      last_name: data.created_last_name,
      avatar: data.avatar,
    },
    created_at: data.created_at,
    edited_at: data.edited_at
  }
});

export const TrendingInsightsSchema = z.array(TrendingInsightSchema);

export const TrendingAuthorSchema = z.object({
  cnt: z.coerce.number(),
  idx: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  avatar: z.string().nullable().transform((a) => a || undefined),
  topics: z.array(z.object({
    idx: z.number(),
    name: z.string(),
  })).optional()
})

export const TrendingAuthorsSchema = z.array(TrendingAuthorSchema);

export type TrendingInsight = z.infer<typeof TrendingInsightSchema>
export type TrendingInsights = z.infer<typeof TrendingInsightsSchema>

export type TrendingAuthor = z.infer<typeof TrendingAuthorSchema>
export type TrendingAuthors = z.infer<typeof TrendingAuthorsSchema>

