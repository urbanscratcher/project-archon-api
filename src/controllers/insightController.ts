import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { Dto, ListDto } from '../dtos/Dto';
import { BadRequestError, NotFoundError } from "../dtos/Errors";
import { asyncHandledDB } from '../utils/connectDB';
import { BASIC_INSIGHTS_LIMIT } from '../utils/constants';
import { checkRequireds, validateParamIdx, getValidUserIdx, toSortSql, respond, toMysqlDate, toFilterSql, toSortsSql } from '../utils/helper';
import { QueryReqSchema } from '../dtos/Query';
const logger = pino({ level: 'debug' });


class InsightDto extends Dto {
  idx: number;
  title: string;
  thumbnail: string;
  content: string;
  summary: string;
  topic: object;
  createdBy: object;
  createdAt: string;
  editedAt?: string | undefined;

  constructor(obj: Array<any>) {
    super();
    this.idx = obj[0].idx;
    this.title = obj[0].title;
    this.thumbnail = obj[0].thumbnail;
    this.content = obj[0].content;
    this.summary = obj[0].summary;
    this.topic = {
      idx: obj[0].topic_idx,
      name: obj[0].topic_name
    }
    this.createdBy = {
      idx: obj[0].created_by,
      firstName: obj[0].created_first_name,
      lastName: obj[0].created_last_name,
      avatar: obj[0].created_avatar,
      biography: obj[0].created_biography,
      topics: obj.length > 1 ? obj.map((o: any) => {
        return {
          idx: o.topic_idx,
          name: o.topic_name
        }
      }) : undefined
    }
    this.createdAt = obj[0].created_at.toISOString();
    this.editedAt = obj[0]?.edited_at?.toISOString() ?? undefined;
  }
}

export const createInsight = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  const createdBy = getValidUserIdx(req);
  const { title, thumbnail, content, summary, topic_idx: topicIdx } = req.body;

  checkRequireds([title, thumbnail, content, summary, topicIdx], ["title", "thumbnail", "content", "summary", "topic_idx"]);

  const result = await conn.query(`
  INSERT INTO INSIGHT
  SET
    title = ?
  , thumbnail = ?
  , content = ?
  , summary = ?
  , topic_idx = ?
  , created_by = ?
  , created_at = ?`,
    [title, thumbnail, content, summary, topicIdx, createdBy, toMysqlDate()]);
  logger.debug({ res: result }, 'DB response');

  respond(res, 201);
})

export const getInsights = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  // query transform
  const query = QueryReqSchema(BASIC_INSIGHTS_LIMIT).parse(req.query);
  const mapFields: Record<string, string> = {
    created_by: 'i.created_by',
    topic_idx: 'i.topic_idx'
  }
  const filterSql = query?.filter && toFilterSql(query.filter, ["idx", "title", "created_by", "topic_idx"])?.replace(/created_by|topic_idx/g, (matched) => mapFields[matched]);
  const sortsSql = query?.sorts && toSortsSql(query.sorts, ["idx", "created_at"])?.map(s => s.replace(/created_by|topic_idx/g, (matched) => mapFields[matched]));

  // DB
  const foundInsights = await conn.query(`
  SELECT tt.total total, tb.*
  FROM (
    SELECT count(*) total
    FROM INSIGHT i
    LEFT JOIN TOPIC t ON i.topic_idx = t.idx
    LEFT JOIN USER u ON i.created_by = u.idx
    WHERE i.del_at is null
    ${filterSql ? `AND ${filterSql}` : ''}
  ) tt,
  (
    SELECT
      i.idx as idx,
      i.title as title,
      i.thumbnail as thumbnail,
      i.summary as summary,
      i.topic_idx as topic_idx,
      t.name as topic_name,
      i.created_at as created_at,
      i.created_by as created_by,
      u.avatar as created_avatar,  	
      u.biography as created_biography,
      u.first_name as created_first_name,
      u.last_name as created_last_name,
      i.edited_at as edited_at
    FROM INSIGHT i
    LEFT JOIN TOPIC t ON i.topic_idx = t.idx
    LEFT JOIN USER u ON i.created_by = u.idx
    WHERE i.del_at is null
    ${filterSql ? `AND ${filterSql}` : ''}
    ORDER BY ${sortsSql ? sortsSql : 'idx DESC'}
    LIMIT ? OFFSET ?
  ) tb
  `, [query.limit, query.offset])

  const total = foundInsights.length > 0 ? Number(foundInsights[0].total) : 0;

  // stringify
  const insights = foundInsights.map((i: any) => new InsightDto([i]))


  const insightList = new ListDto<InsightDto>(insights, total, query.offset, query.limit);

  respond(res, 200, insightList)
})

export const getInsight = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  const idx = validateParamIdx(req);

  const foundInsights = await conn.query(`SELECT
    i.idx as idx,
    i.title as title,
    i.thumbnail as thumbnail,
    i.content as content,
    i.summary as summary,
    i.topic_idx as topic_idx,
    i.created_at as created_at,
    i.created_by as created_by,
    i.edited_at as edited_at,
    i.edited_by as edited_by,
    cu.first_name as created_first_name,
    cu.last_name as created_last_name,
    cu.avatar as created_avatar,
    cu.biography as created_biography,
    t.name as topic_name,
    t2.seq as created_topic_seq,
    t2.idx as created_topic_idx,
    t2.name as created_topic_name
  FROM INSIGHT i
  LEFT JOIN USER cu ON i.created_by = cu.idx
  LEFT JOIN USER_TOPIC ut ON i.created_by = ut.user_idx
  LEFT JOIN TOPIC t2 ON t2.idx  = ut.topic_idx
  LEFT JOIN TOPIC t ON i.topic_idx = t.idx
  WHERE i.idx = ?
  AND i.del_at is null`, idx);

  if (foundInsights <= 0) {
    throw new NotFoundError('insight not found')
  }

  const insight: InsightDto = new InsightDto(foundInsights);


  respond(res, 200, insight)
})

export const deleteInsight = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  const idx = validateParamIdx(req);

  const foundInsights = await conn.query(`SELECT * FROM INSIGHT WHERE idx = ? AND del_at is null`, idx);

  if (foundInsights.length <= 0) {
    throw new NotFoundError('insight not found')
  }

  const result = await conn.query(`
  UPDATE INSIGHT SET
    del_at = ?
  WHERE idx = ?`, [toMysqlDate(), idx]);
  logger.debug({ res: result }, 'DB response');

  respond(res, 200)
})

export const updateInsight = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  const editedBy = getValidUserIdx(req);
  const idx = validateParamIdx(req);

  // insight exist check
  const foundInsights = await conn.query(`SELECT * FROM INSIGHT WHERE idx = ? AND del_at is null`, idx);
  if (foundInsights.length <= 0) {
    throw new NotFoundError('insight not found')
  }

  // parse
  const title = req.body?.title ?? null;
  const thumbnail = req.body?.thumbnail ?? null;
  const content = req.body?.content ?? null;
  const summary = req.body?.summary ?? null;
  const topicIdx = req.body?.topic_idx ?? null;

  await conn.query(`
  UPDATE INSIGHT SET
    title = ?,
    thumbnail = ?,
    content = ?,
    summary = ?,
    topic_idx = ?,
    edited_by = ?,
    edited_at = ?   
  WHERE idx = ?
  `, [
    title,
    thumbnail,
    content,
    summary,
    topicIdx,
    editedBy,
    toMysqlDate(),
    idx
  ])

  respond(res, 200)
})
