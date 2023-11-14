import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { Dto, ListDto } from '../dtos/Dto';
import { BadRequestError, NotFoundError } from "../dtos/Errors";
import { asyncHandledDB } from '../utils/connectDB';
import { BASIC_INSIGHTS_LIMIT } from '../utils/constants';
import { checkRequireds, getValidIdx, getValidUserIdx, parseOrderQuery, respond, toMysqlDate } from '../utils/helper';
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
      avatar: obj[0].avatar,
      biography: obj[0].biography,
      topics: obj.length > 1 ? obj.map((o: any) => {
        return {
          idx: o.created_topic_idx,
          seq: o.created_topic_seq,
          name: o.created_topic_name
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

  const offset = req.query?.offset ? req.query.offset : 0;
  const limit = req.query?.limit ? req.query.limit : BASIC_INSIGHTS_LIMIT;
  const order = req.query?.order ? req.query.order : null;
  const filter = req.query?.filter ? req.query.filter : null;
  const parsedFilter = typeof filter === 'string' && filter !== null && JSON.parse(filter);
  const parsedOrder = typeof order === 'string' && order !== null && parseOrderQuery(order);

  // type check
  if (typeof offset !== 'number' || typeof limit !== 'number') {
    throw new BadRequestError('offset, limit should be number');
  }

  // validation check
  if (parsedFilter?.topic_idx && typeof parsedFilter.topic_idx !== 'number') {
    throw new BadRequestError('topic_idx should be number')
  }

  if (parsedFilter?.created_by && typeof parsedFilter.created_by !== 'number') {
    throw new BadRequestError('created_by should be number')
  }


  const insights = await conn.query(`
  SELECT tb.*
  FROM (
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
      u.first_name as created_first_name,
      u.last_name as created_last_name,
      i.edited_at as edited_at
    FROM INSIGHT i
    LEFT JOIN TOPIC t ON i.topic_idx = t.idx
    LEFT JOIN USER u ON i.created_by = u.idx
    WHERE i.del_at is null
    ${parsedFilter?.topic_idx ? 'AND i.topic_idx=' + parsedFilter?.topic_idx : ''}
    ${parsedFilter?.created_by ? 'AND i.created_by=' + parsedFilter?.created_by : ''}
  ) tb
  ORDER BY ?
  LIMIT ? OFFSET ?
  `, [
    parsedOrder ? parsedOrder : 'idx DESC',
    limit, offset
  ])

  const data = insights.map((i: any) => new InsightDto([i]))

  const totalResult = await conn.query(`
  SELECT count(*) as total
  FROM INSIGHT
  WHERE del_at is null
  `)
  const total = Number(totalResult[0].total);

  const insightList = new ListDto<InsightDto>(data, total, offset, limit);

  respond(res, 200, insightList)
})

export const getInsight = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  const idx = getValidIdx(req);

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
  const idx = getValidIdx(req);

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
  const idx = getValidIdx(req);

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