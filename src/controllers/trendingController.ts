import { NotFoundError } from "../dtos/Errors";
import { TrendingInsightsSchema } from "../schemas/TrendingSchema";
import { asyncHandledDB } from "../utils/connectDB";
import { sub } from 'date-fns';
import { respond } from "../utils/helper";
import { Request, Response } from "express";

export const getTrendingInsights = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  const foundInsights = await conn.query(`SELECT
    i.idx,
    h.hits,
    i.title,
    i.thumbnail,
    i.summary,
    i.topic_idx,
    t.name as topic_name,
    i.created_at,
    i.created_by,
    u.first_name as created_first_name,
    u.last_name as created_last_name,
    u.avatar,
    i.edited_at
  FROM (
    SELECT ih.insight_idx, COUNT(*) as hits 
    FROM INSIGHT_HITS ih
    WHERE ih.created_at >= ?
    GROUP BY ih.insight_idx
    ORDER BY hits DESC, insight_idx DESC
    LIMIT 5
  ) as h
  JOIN INSIGHT i ON h.insight_idx = i.idx
  LEFT JOIN TOPIC t on t.idx = i.topic_idx
  LEFT JOIN USER u on u.idx = i.created_by`, [sub(new Date(), { months: 3 })]);

  if (foundInsights?.length <= 1) {
    throw new NotFoundError('No or too less insights found')
  }

  const trendingInsights = TrendingInsightsSchema.parse(foundInsights);

  respond(res, 200, trendingInsights)
})

export const getTrendingAuthors = asyncHandledDB(async (conn: any, req: Request, res: Response) => {



  res.json()
})