import { sub } from "date-fns";
import { Request, Response } from "express";
import { InternalError, NotFoundError } from "../dtos/Errors";
import { QueryReqSchema } from "../dtos/Query";
import {
  TrendingAuthorSchema,
  TrendingInsightsSchema,
  type TrendingAuthor,
} from "../schemas/TrendingSchema";
import { asyncHandledDB } from "../utils/connectDB";
import { respond } from "../utils/helper";
import { BASIC_TRENDING_LIMIT } from "./../utils/constants";

export const getTrendingInsights = asyncHandledDB(
  async (conn: any, req: Request, res: Response) => {
    const query = QueryReqSchema(BASIC_TRENDING_LIMIT).parse(req.query);

    const foundInsights = await conn.query(
      `SELECT
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
    LIMIT ?
  ) as h
  JOIN INSIGHT i ON h.insight_idx = i.idx
  LEFT JOIN TOPIC t on t.idx = i.topic_idx
  LEFT JOIN USER u on u.idx = i.created_by`,
      [sub(new Date(), { months: 3 }), query.limit]
    );

    if (foundInsights?.length <= 1) {
      throw new NotFoundError("No or too less insights found");
    }

    const trendingInsights = TrendingInsightsSchema.parse(foundInsights);

    respond(res, 200, trendingInsights);
  }
);

export const getTrendingAuthors = asyncHandledDB(
  async (conn: any, req: Request, res: Response) => {
    const query = QueryReqSchema(BASIC_TRENDING_LIMIT).parse(req.query);

    const foundAuthors = await conn.query(
      `
    SELECT
      COUNT(*) AS cnt,
      i.created_by AS idx,
      u.first_name,
      u.last_name,
      u.avatar
    FROM INSIGHT i
    LEFT JOIN USER u ON u.idx = i.created_by
    WHERE i.created_at >= ?
    AND i.del_at IS NULL
    AND u.del_at IS NULL
    GROUP BY i.created_by
    ORDER BY cnt DESC
    LIMIT ? OFFSET 0
  `,
      [sub(new Date(), { months: 3 }), query.limit]
    );

    if (!foundAuthors) {
      throw new InternalError("Failed to fetch authors");
    }

    const parsed = await Promise.all(
      foundAuthors.map(async (a: any) => {
        const author = TrendingAuthorSchema.safeParse(a);
        if (!author.success) {
          throw new InternalError("Failed to parse authors");
        }

        const topics = await conn.query(
          `
      SELECT t.idx, t.name
        FROM USER_TOPIC ut
        LEFT JOIN TOPIC t ON t.idx = ut.topic_idx
        WHERE ut.user_idx = ?
      ORDER BY t.seq`,
          [a.idx]
        );

        if (topics?.length > 0) {
          author.data.topics = topics;
        }

        return author.data as TrendingAuthor;
      })
    );

    respond(res, 200, parsed);
  }
);
