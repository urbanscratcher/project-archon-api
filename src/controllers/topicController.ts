import { Request, Response } from 'express';
import pino from 'pino';
import { ListDto } from '../dtos/Dto';
import { BadRequestError, DuplicationError, NotFoundError } from "../dtos/Errors";
import { asyncHandledDB } from '../utils/connectDB';
import { checkRequireds, validateParamIdx, isSpecialOrBlank, respond, toArray } from '../utils/helper';
const logger = pino({ level: 'debug' });

export const createTopic = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  // parsing
  const name = req.body?.name;
  const createdBy = req?.userIdx;

  // validation check  
  if (!name) {
    throw new BadRequestError('name is required')
  }

  if (!Number.isInteger(createdBy)) {
    throw new BadRequestError('user idx is required')
  }

  isSpecialOrBlank(name);

  // duplicated check
  const existingNames = await conn.query(`SELECT * FROM TOPIC where name = ?`, name);
  if (existingNames.length > 0) {
    throw new DuplicationError('duplicated name');
  }

  // last order number check
  let lastOrder: number = 0;
  const topics = await conn.query(`SELECT * FROM TOPIC ORDER BY seq DESC`);
  if (topics.length > 0) {
    lastOrder = topics[0].seq;
  }

  // DB
  const result = await conn.query(`INSERT INTO TOPIC (name, created_by, seq) values ( ?, ?, ?)`, [name, createdBy, lastOrder + 1]);
  logger.debug({ res: result }, 'DB response');

  respond(res, 201);
})

export const updateTopic = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  // parsing
  const name = req.body?.name;
  const createdBy = req?.userIdx;

  // validation check  
  if (!name) {
    throw new BadRequestError('name is required')
  }

  const idx = validateParamIdx(req);

  if (!Number.isInteger(createdBy)) {
    throw new BadRequestError('user idx is required')
  }

  isSpecialOrBlank(name);

  // exist check
  const existingTopic = await conn.query(`SELECT * FROM TOPIC where idx = ?`, idx);
  if (existingTopic.length <= 0) {
    throw new NotFoundError('topic not found');
  }

  // duplicated check
  const existingNames = await conn.query(`SELECT * FROM TOPIC where name = ?`, name);
  if (existingNames.length > 0) {
    throw new DuplicationError('duplicated name');
  }

  // DB
  const result = await conn.query(`UPDATE TOPIC
    SET
      name = ?,
      created_by = ?
    WHERE idx = ?`,
    [name, createdBy, idx]);
  logger.debug({ res: result }, 'DB response');

  respond(res, 200);
})

export const getAllTopics = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  // DB
  const topics = await conn.query(`
  SELECT
    t.idx as idx,
    t.name as name,
    t.seq as seq,
    t.created_by as created_by,
    IFNULL(ti.total_insights,0) as total_insights
  FROM TOPIC t
  LEFT JOIN (SELECT 
      i.idx as topic_idx,
      count(*) as total_insights
    FROM INSIGHT i
    GROUP BY i.topic_idx) ti ON ti.topic_idx = t.idx
  ORDER BY t.seq ASC
`);

  const topicList = new ListDto<any>(topics.map((topic: any) => { return { idx: topic.idx, name: topic.name, seq: topic.seq, totalInsights: Number(topic.total_insights) } }), topics.length);
  respond(res, 200, topicList);
})

export const updateTopics = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  // validation
  const idxSeq = req.body?.idx_sequence ? toArray(req.body?.idx_sequence) : null;
  if (!idxSeq) {
    throw new BadRequestError('idx_sequence is required');
  }

  const topics = await conn.query(`SELECT idx, seq FROM TOPIC`)

  if (topics.length !== idxSeq.length) {
    throw new BadRequestError('check idx_sequence length')
  }

  try {
    await conn.beginTransaction();
    idxSeq.forEach(async (idx: number, seqNum: number) => {
      await conn.query(`UPDATE TOPIC SET seq = ? WHERE idx = ?`, [seqNum + 1, idx]);
    })
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  }

  respond(res, 200)
})

export const removeTopic = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  const idx = validateParamIdx(req);

  // check if exists
  const topics = await conn.query(`SELECT * FROM TOPIC WHERE idx = ?`, idx);
  if (topics.length <= 0) {
    throw new NotFoundError('topic not found')
  }

  const result = await conn.query(`DELETE FROM TOPIC WHERE idx = ?`, idx);
  logger.debug(result, 'DB response')

  respond(res, 200);
})
