import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { ListDto } from '../classes/Dto';
import { BadRequestError, DuplicationError, NotFoundError } from "../classes/Errors";
import { checkRequireds, getValidatedIdx, respond, toArray } from '../utils/helper';
const logger = pino({ level: 'debug' });

export async function createCategory(conn: any, req: Request, res: Response) {
  // parsing
  const { name, created_by: createdBy } = req.body

  // required check
  checkRequireds([name, createdBy], ['name', 'created_by']);

  // duplicated check
  const existingNames = await conn.query(`SELECT * FROM CATEGORY where name = '${name}'`);
  if (existingNames.length > 0) {
    throw new DuplicationError('duplicated name');
  }

  // last order number check
  let lastOrder: number = 0;
  const categories = await conn.query(`SELECT * FROM CATEGORY ORDER BY seq DESC`);
  if (categories.length > 0) {
    lastOrder = categories[0].seq;
  }

  // DB
  const result = await conn.query(`INSERT INTO CATEGORY (name, created_by, seq) values ('${name}',${createdBy}, ${lastOrder + 1})`);
  logger.debug({ res: result }, 'DB response');

  respond(res, 200);
}


export async function updateCategory(conn: any, req: Request, res: Response) {
  // parsing
  const { name, created_by: createdBy } = req.body
  const idx = getValidatedIdx(req);

  // required check
  checkRequireds([name, createdBy], ['name', 'created_by']);

  // exist check
  const existingCategory = await conn.query(`SELECT * FROM CATEGORY where idx = '${idx}'`);
  if (existingCategory.length <= 0) {
    throw new NotFoundError('category not found');
  }

  // duplicated check
  const existingNames = await conn.query(`SELECT * FROM CATEGORY where name = '${name}'`);
  if (existingNames.length > 0) {
    throw new DuplicationError('duplicated name');
  }

  // DB
  const result = await conn.query(`UPDATE CATEGORY SET name='${name}', created_by=${createdBy} WHERE idx=${idx}`);
  logger.debug({ res: result }, 'DB response');

  respond(res, 200);
}

export async function getAllCategories(conn: any, req: Request, res: Response) {
  // DB
  const categories = await conn.query(`SELECT name FROM CATEGORY ORDER BY seq ASC`);

  const categoryList = new ListDto<any>(categories.map((category: any) => category.name), categories.length);
  respond(res, 200, categoryList);
}

export async function updateCategories(conn: any, req: Request, res: Response) {
  // validation
  const idxSeq = req.body?.idx_sequence ? toArray(req.body?.idx_sequence) : null;
  if (!idxSeq) {
    throw new BadRequestError('idx_sequence is required');
  }

  const categories = await conn.query(`SELECT idx, seq FROM CATEGORY`)

  if (categories.length !== idxSeq.length) {
    throw new BadRequestError('check idx_sequence length')
  }

  try {
    await conn.beginTransaction();
    idxSeq.forEach(async (idx: number, seqNum: number) => {
      await conn.query(`UPDATE CATEGORY SET seq = ${seqNum + 1} WHERE idx = ${idx}`);
    })
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  }

  respond(res, 200)
}

export async function removeCategory(conn: any, req: Request, res: Response) {
  const idx = getValidatedIdx(req);
  await conn.query(`DELETE FROM CATEGORY WHERE idx=${idx}`);
  respond(res, 200);
}
