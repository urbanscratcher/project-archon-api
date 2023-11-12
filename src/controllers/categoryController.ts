import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { BadRequestError, DuplicationError, NotFoundError } from "../classes/Errors";
const logger = pino({ level: 'debug' });

export async function createCategory(conn: any, req: Request, res: Response) {
  const name = req?.body?.name
  if (!name) {
    throw new BadRequestError('bad');
  }

  const getExistingName = await conn.query(`SELECT * FROM CATEGORY where name = '${name}'`);

  if (getExistingName.length <= 0) {
    const result = await conn.query(`INSERT INTO CATEGORY (name) values ('${name}')`);
    logger.debug({ res: result }, 'DB response');
    res.status(200).send();

  } else {
    throw new DuplicationError('duplicated name');
  }
}

