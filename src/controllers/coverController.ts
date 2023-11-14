import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { ListDto } from '../dtos/Dto';
import { BadRequestError, DuplicationError, NotFoundError } from "../dtos/Errors";
import { getValidIdx, getValidUserIdx, respond, toMysqlDate } from '../utils/helper';
import { asyncHandledDB } from './../utils/connectDB';
const logger = pino({ level: 'debug' });

const BASIC_COVERS_LIMIT = 3;


export const createCover = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  const createdBy = getValidUserIdx(req);
  const insightIdx = req.body?.insight_idx

  if (insightIdx === undefined || insightIdx === null) {
    throw new BadRequestError('insight idx is required and should be a number')
  }

  if (!Number.isInteger(insightIdx)) {
    throw new BadRequestError('insight idx should be a number')
  }


  const insights = await conn.query(`SELECT * FROM INSIGHT WHERE idx = ?`, insightIdx);
  if (insights.length <= 0) {
    throw new NotFoundError('insight not found')
  }

  const existingCovers = await conn.query(`SELECT * FROM COVER WHERE insight_idx = ?`, insightIdx);
  if (existingCovers.length > 0) {
    throw new DuplicationError('insight already exists')
  }

  const totalResult = await conn.query(`SELECT count(*) as total FROM COVER`);
  const total = Number(totalResult[0].total);
  console.log(total);
  const isMain = total <= 0 ? true : false;

  const result = await conn.query(`INSERT INTO COVER
  SET
    insight_idx = ?
    , is_main = ?
    , created_by = ?
    , created_at = ?
  `, [insightIdx, isMain, createdBy, toMysqlDate()])
  logger.debug({ res: result }, 'DB response');

  respond(res, 201);
})


export const updateCover = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  const idx = getValidIdx(req);

  // check if cover exists
  const covers = await conn.query(`SELECT * FROM COVER WHERE idx = ?`, idx);
  if (covers.length <= 0) {
    throw new NotFoundError('cover not found')
  }

  const mainCovers = await conn.query(`SELECT * FROM COVER WHERE is_main = 1`);


  // if no main cover
  if (mainCovers.length <= 0) {
    await conn.query(`UPDATE COVER SET is_main = true WHERE idx = ?`, idx);
  }

  // if main cover = input cover
  if (mainCovers.length > 0 && mainCovers[0].idx === idx) {
    throw new BadRequestError('the cover is already main')
  }

  // else
  if (mainCovers.length > 0) {
    try {
      await conn.beginTransaction();

      await conn.query(`
      UPDATE COVER SET
        is_main = false
      WHERE idx = ?
    `, mainCovers[0].idx);

      await conn.query(`
        UPDATE COVER SET
          is_main = true
        WHERE idx = ?
      `, [idx]);

      await conn.commit();
    } catch (e) {
      await conn.rollback();
      next(e);
    }
  }

  respond(res, 200);
})

export const removeCover = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  const idx = getValidIdx(req);

  const covers = await conn.query(`SELECT * FROM COVER WHERE idx = ?`, idx);
  if (covers.length <= 0) {
    throw new NotFoundError('cover not found')
  }

  if (covers[0].is_main === 1) {
    throw new BadRequestError('main cover cannot be removed')
  }

  const result = await conn.query(`DELETE FROM COVER WHERE idx = ?`, idx);
  logger.debug({ res: result }, 'DB response');

  respond(res, 200);
})

export const getAllCovers = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  const covers = await conn.query(`
    SELECT
      c.idx as idx,
      c.insight_idx as insight_idx,
      c.created_at as created_at,
      c.created_by as created_by,
      i.title as title,
      i.thumbnail as thumbnail,
      i.topic_idx as topic_idx,
      t.name as topic_name,
      c.is_main as is_main
    FROM COVER c
    LEFT JOIN INSIGHT i ON c.insight_idx = i.idx
    LEFT JOIN TOPIC t ON i.topic_idx = t.idx
    ORDER BY is_main DESC, idx DESC
    LIMIT ? OFFSET 0`, BASIC_COVERS_LIMIT);

  const data = covers.length > 0 ? covers.map((c: any) => {
    return {
      idx: c.idx,
      is_main: c.is_main === 1 ? true : false,
      insight: {
        idx: c.insight_idx,
        title: c.title,
        thumbnail: c.thumbnail,
      },
      topic: {
        idx: c.topic_idx,
        name: c.topic_name
      },
      created_at: c.created_at.toISOString(),
      created_by: c.created_by
    }
  }) : [];

  const coverList = new ListDto<any>(data, data.length);

  respond(res, 200, coverList)
})

