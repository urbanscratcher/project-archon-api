import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { ListDto } from '../classes/Dto';
import { BadRequestError, DuplicationError, NotFoundError } from "../classes/Errors";
import { checkRequireds, getValidatedIdx, respond, toArray, toMysqlDate } from '../utils/helper';
const logger = pino({ level: 'debug' });

const BASIC_COVERS_LIMIT = 3;


export async function createCover(conn: any, req: Request, res: Response) {
  const { insight_idx: insightIdx, created_by: createdBy } = req.body;

  checkRequireds([insightIdx, createdBy], ['insight_idx', 'created_by']);

  const insights = await conn.query(`SELECT * FROM INSIGHT WHERE idx = ${insightIdx}`);
  if (insights.length <= 0) {
    throw new NotFoundError('insight not found')
  }

  const existingCovers = await conn.query(`SELECT * FROM COVER WHERE insight_idx = ${insightIdx}`);
  if (existingCovers.length > 0) {
    throw new DuplicationError('insight already exists')
  }

  const totalResult = await conn.query(`SELECT count(*) as total FROM COVER`);
  const total = Number(totalResult[0].total);
  console.log(total);
  const isMain = total <= 0 ? true : false;

  const result = await conn.query(`INSERT INTO COVER
  SET
    insight_idx = ${insightIdx}
    , is_main = ${isMain}
    , created_by = ${createdBy}
    , created_at = '${toMysqlDate()}'
  `)
  logger.debug({ res: result }, 'DB response');

  respond(res, 201);
}


export async function updateCover(conn: any, req: Request, res: Response, next: NextFunction) {
  const idx = getValidatedIdx(req);

  const covers = await conn.query(`SELECT * FROM COVER WHERE idx = ${idx}`);
  if (covers.length <= 0) {
    throw new NotFoundError('cover not found')
  }

  const mainCovers = await conn.query(`SELECT * FROM COVER WHERE is_main = 1`);

  const isMain = Boolean(req.body?.is_main);
  if (!isMain) {
    throw new BadRequestError('is_main should exists')
  }

  try {
    await conn.beginTransaction();
    await conn.query(`
      UPDATE COVER SET
        is_main = ${isMain}
      WHERE idx = ${idx}
    `);
    await conn.query(`
      UPDATE COVER SET
        is_main = false
      WHERE idx = ${mainCovers[0].idx}
    `);
    await conn.commit();
    respond(res, 200);
  } catch (e) {
    await conn.rollback();
    next(e);
  }
}


export async function removeCover(conn: any, req: Request, res: Response) {
  const idx = getValidatedIdx(req);

  const covers = await conn.query(`SELECT * FROM COVER WHERE idx = ${idx}`);
  if (covers.length <= 0) {
    throw new NotFoundError('cover not found')
  }

  if (covers[0].is_main === 1) {
    throw new BadRequestError('main cover cannot be removed')
  }

  const result = await conn.query(`DELETE FROM COVER WHERE idx = ${idx}`);
  logger.debug({ res: result }, 'DB response');

  respond(res, 200);
}


export async function getAllCovers(conn: any, req: Request, res: Response) {
  const covers = await conn.query(`
  SELECT
    c.idx as idx,
    c.insight_idx as insight_idx,
    c.created_at as created_at,
    c.created_by as created_by,
    i.title as title,
    i.thumbnail as thumbnail,
    i.topic_idx as topic_idx,
    t.name as topic_name
  FROM COVER c
  LEFT JOIN INSIGHT i ON c.insight_idx = i.idx
  LEFT JOIN TOPIC t ON i.topic_idx = t.idx
  LIMIT ${BASIC_COVERS_LIMIT} OFFSET 0`);

  const data = covers.length > 0 ? covers.map((c: any) => {
    return {
      idx: c.idx,
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
}

