import { Request, Response } from "express";
import { BadRequestError, NotFoundError } from "../dtos/Errors";
import { asyncHandledDB } from "../utils/connectDB";
import { respond, toMysqlDate } from "../utils/helper";
import pino from "pino";
import { InsightHitsSchema } from "../schemas/insightHitsSchema";
const logger = pino({ level: 'debug' });


export const addInsightHits = asyncHandledDB(async (conn: any, req: Request, res: Response) => {

  const insightIdx = +req.params?.idx || 0;

  if (insightIdx === undefined || insightIdx <= 0) {
    throw new BadRequestError('no insight');
  }

  const insightFound = await conn.query(`
    SELECT *
    FROM INSIGHT
    WHERE idx = ?
    AND del_at is null`, [insightIdx]);

  if (insightFound?.length <= 0) {
    throw new NotFoundError('no insight found');
  }

  console.log(insightFound);

  const ip = req.headers['x-forwarded-for'] || req.ip?.split(':')[2] === "1" ? "127.0.0.1" : req.ip?.split(':')[2];

  if (!ip) {
    throw new BadRequestError('ip not validated');
  }

  const result = await conn.query(`
  INSERT INTO INSIGHT_HITS
  SET
    insight_idx = ?
  , ip = INET_ATON(?)
  , created_at = ?`,
    [insightIdx, ip, toMysqlDate()]);

  logger.debug({ res: result }, 'DB response');

  respond(res, 201, { idx: Number(result?.insertId) });
})


export const getInsightHits = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  const insightIdx = +req.params?.idx || 0;

  if (insightIdx === undefined || insightIdx <= 0) {
    throw new BadRequestError('no insight');
  }

  const insightFound = await conn.query(`
  SELECT *
  FROM INSIGHT
  WHERE idx = ?
  AND del_at is null`, [insightIdx]);

  if (insightFound?.length <= 0) {
    throw new NotFoundError('no insight found');
  }

  const result = await conn.query(`
    SELECT insight_idx, COUNT(*) as hits
    FROM INSIGHT_HITS ih
    WHERE ih.insight_idx = ?
    GROUP BY ih.insight_idx
  `, [insightIdx]);

  if (result?.length <= 0) {
    throw new NotFoundError('no insight hits found');
  }

  const data = InsightHitsSchema.parse(result[0]);
  respond(res, 200, data);
})