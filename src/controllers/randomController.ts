import { Request, Response } from "express";
import { InternalError, NotFoundError } from "../dtos/Errors";
import { InsightRandomSchema, InsightRandomType, InsightRandomListSchema } from "../schemas/InsightRandomSchema";
import { asyncHandledDB } from "../utils/connectDB";
import { respond } from "../utils/helper";

export const getRandomInsights = asyncHandledDB(async (conn: any, req: Request, res: Response) => {

  const limit = req.query?.limit || 6;

  const randomInsights = await conn.query(`SELECT idx, thumbnail, title, summary
  FROM INSIGHT
  WHERE del_at IS NULL
  ORDER BY RAND()
  LIMIT ?`, [limit]);
  if (randomInsights?.length < 0) {
    throw new NotFoundError('No insights found');
  }


  const parsedData = InsightRandomListSchema.safeParse(randomInsights);

  if (!parsedData.success) {
    throw new InternalError('Failed to parse data');
  }

  respond(res, 200, parsedData.data)
});