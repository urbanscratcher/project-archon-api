import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { Dto, ListDto } from '../classes/Dto';
import { BadRequestError, DuplicationError, NotFoundError } from "../classes/Errors";
import { checkRequireds, getValidatedIdx, nullableField, respond, toArray, toMysqlDate } from '../utils/helper';
const logger = pino({ level: 'debug' });


class UserDto extends Dto {
  idx: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  avatar?: string | undefined;
  jobTitle?: string | undefined;
  biography?: string | undefined;
  careers?: string | undefined;
  categories?: Array<any> | undefined;
  createdAt: string;

  constructor(obj: Array<any>) {
    super();
    this.idx = obj[0].idx;
    this.email = obj[0].email;
    this.password = obj[0].password;
    this.firstName = obj[0].first_name;
    this.lastName = obj[0].last_name;
    this.isAdmin = obj[0].is_admin === 1 ? true : false;
    this.avatar = obj[0].avatar ?? undefined;
    this.jobTitle = obj[0].job_title ?? undefined;
    this.biography = obj[0].biography ?? undefined;
    this.careers = obj[0].careers ? obj[0].careers.replace(/"/g, "'") : undefined;
    this.createdAt = obj[0].created_at.toISOString();
    this.categories = Array.isArray(obj) && obj.length > 1 ? obj.map((o: any) => {
      return {
        idx: o.category_idx,
        name: o.category_name,
        seq: o.category_seq
      }
    }) : undefined;

  }
}


export async function createUser(conn: any, req: Request, res: Response) {
  // parsing
  const { email, password, first_name: firstName, last_name: lastName } = req.body;
  const isAdmin = Boolean(req.body.is_admin === 'true');
  const avatar = req.body?.avatar || null;
  const jobTitle = req.body?.job_title || null;
  const biography = req.body?.biography || null;
  const careers = req.body?.careers ? toArray(req.body?.careers) : null;
  const categories = req.body?.categories ? toArray(req.body?.categories) : null;


  // required check
  checkRequireds([email, password, firstName, lastName, req.body?.is_admin], ['email', 'password', 'first_name', 'last_name', 'is_admin'])

  // DB
  try {
    await conn.beginTransaction();
    const result = await conn.query(`INSERT INTO USER (email, password, first_name, last_name, is_admin, avatar, job_title, biography, careers, created_at) values ('${email}', '${password}', '${firstName}', '${lastName}', ${isAdmin}, ${nullableField(avatar)}, ${nullableField(jobTitle)}, ${nullableField(biography)}, ${careers ? "'" + JSON.stringify(careers) + "'" : 'NULL'}, '${toMysqlDate()}')`);
    logger.debug({ res: result }, 'DB response');

    categories.forEach(async (categoryIdx: number) => {
      const cateResult = await conn.query(`INSERT INTO USER_CATEGORY (user_idx, category_idx) values (${Number(result.insertId)}, ${categoryIdx})`);
      logger.debug({ res: cateResult }, 'DB response');
    })

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  }

  respond(res, 201);
}

export async function getUsers(conn: any, req: Request, res: Response) {
  // DB
  const foundUsers = await conn.query(`SELECT * FROM USER WHERE del_at is NULL`);

  // stringify
  const users: Array<UserDto> = foundUsers.map((user: any) => new UserDto([user]));

  const usersWithExtraInfo = [];
  for (let u of users) {
    const foundExtraInfo = await conn.query(`
    SELECT
    c.idx as idx,
    c.name as name,
    c.seq as seq
  FROM USER_CATEGORY uc
  LEFT JOIN CATEGORY c ON uc.category_idx  = c.idx
  WHERE user_idx = ${u.idx}`);
    u.categories = foundExtraInfo.length > 0 ? foundExtraInfo : undefined;
    usersWithExtraInfo.push(u);
  }

  const userList: ListDto<any> = new ListDto(usersWithExtraInfo, usersWithExtraInfo.length)

  respond(res, 200, userList);
}

export async function getUser(conn: any, req: Request, res: Response) {
  // parse
  const idx = getValidatedIdx(req);

  // exist check
  const foundUsers = await conn.query(`SELECT
	u.idx as idx,
	u.email as email,
	u.password as password,
	u.first_name as first_name,
	u.last_name as last_name,
	u.is_admin as is_admin,
	u.avatar as avatar,
	u.job_title as job_title,
	u.biography as biography,
	u.careers as careers,
	u.created_at as created_at,
	c.idx as category_idx,
	c.name as category_name,
	c.seq as category_seq
FROM USER u
LEFT JOIN USER_CATEGORY uc ON u.idx = uc.user_idx 
LEFT JOIN CATEGORY c ON uc.category_idx = c.idx 
WHERE u.idx = ${idx}
AND u.del_at is NULL`);
  if (foundUsers.length <= 0) {
    throw new NotFoundError(`user not found`)
  }

  // get extra info
  const categories = await conn.query(`SELECT * FROM USER_CATEGORY WHERE user_idx = ${idx}`);

  const user: UserDto = new UserDto(foundUsers);

  respond(res, 200, user);
}

export async function deleteUser(conn: any, req: Request, res: Response) {
  // parse
  const idx = getValidatedIdx(req);

  // exist check
  const foundUsers = await conn.query(`SELECT * FROM USER WHERE idx = ${idx} AND del_at is NULL`);
  if (foundUsers.length <= 0) {
    throw new NotFoundError(`user not found`)
  }

  // DB
  await conn.beginTransaction();
  try {
    const result = await conn.query(`UPDATE USER SET del_at = '${toMysqlDate()}' WHERE idx = ${idx}`);
    logger.debug({ res: result }, 'DB response');

    const cateResult = await conn.query(`DELETE FROM USER_CATEGORY WHERE user_idx=${idx}`);
    logger.debug({ res: cateResult }, 'DB response');

    await conn.commit();
  } catch (e) {
    await conn.rollback()
    throw e;
  }
  respond(res, 200);
}
