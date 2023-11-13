import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { Dto, ListDto } from '../classes/Dto';
import { DuplicationError, NotFoundError, UnauthenticatedError } from "../classes/Errors";
import { createTokens } from '../utils/createJwt';
import { decryptAES256 } from '../utils/crypto';
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
  topics?: Array<any> | undefined;
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
    this.topics = Array.isArray(obj) && obj.length > 1 ? obj.map((o: any) => {
      return {
        idx: o.topic_idx,
        name: o.topic_name,
        seq: o.topic_seq
      }
    }) : undefined;

  }
}

export async function createUser(conn: any, req: Request, res: Response, next: NextFunction) {

  // parsing
  const { email, password, first_name: firstName, last_name: lastName, password_confirm: passwordConfirm } = req.body;
  const isAdmin = false;
  const avatar = req.body?.avatar || null;
  const jobTitle = req.body?.job_title || null;
  const biography = req.body?.biography || null;
  const careers = req.body?.careers ? toArray(req.body?.careers) : null;
  const topics = req.body?.topics ? toArray(req.body?.topics) : null;


  // required check
  checkRequireds([email, password, passwordConfirm, firstName, lastName], ['email', 'password', 'password_confirm', 'first_name', 'last_name'])

  // password confirm check
  if (password !== passwordConfirm) {
    throw new UnauthenticatedError('password is not matched')
  }

  // email duplication check
  const emails = await conn.query(`SELECT * FROM USER WHERE email = '${email}'`);
  if (emails.length > 0) {
    throw new DuplicationError('email already exists')
  }

  // AES256 decryption
  let decryptedPassword = '';
  try {
    const secret: string = process.env.AES_SECRET ?? '';
    decryptedPassword = decryptAES256(secret, password);
  } catch (e: any) {
    e.message = 'encryption error'
    next(e)
  }

  // bcrypt password
  const hashedPassword = await bcrypt.hash(decryptedPassword, 12);

  // DB insertion & jwt & respond, otherwise rollback
  try {
    await conn.beginTransaction();
    const result = await conn.query(`
    INSERT INTO USER
    SET
    email = '${email}'
    , password = '${hashedPassword}'
    , first_name = '${firstName}'
    , last_name = '${lastName}'
    , is_admin = ${isAdmin}
    , avatar = ${nullableField(avatar)}
    , job_title = ${nullableField(jobTitle)}
    , biography = ${nullableField(biography)}
    , careers = ${careers ? "'" + JSON.stringify(careers) + "'" : 'NULL'}
    , created_at = '${toMysqlDate()}'`);
    logger.debug({ res: result }, 'DB response');
    const insertedIdx = Number(result.insertId);

    if (topics) {
      for (const topicIdx of topics) {
        const topic = await conn.query(`SELECT * FROM TOPIC WHERE idx = ${topicIdx}`);

        if (topic.length <= 0) {
          throw new NotFoundError(`topic not exist`);
        }
      }

      topics.forEach(async (topicIdx: number) => {
        const cateResult = await conn.query(`INSERT INTO USER_TOPIC (user_idx, topic_idx) values (${insertedIdx}, ${topicIdx})`);
        logger.debug({ res: cateResult }, 'DB response');
      })
    }
    await conn.commit();

    // create jwt tokens
    respond(res, 201, createTokens({ idx: insertedIdx }));
  } catch (e) {
    await conn.rollback();
    next(e);
  }
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
  FROM USER_TOPIC uc
  LEFT JOIN TOPIC c ON uc.topic_idx  = c.idx
  WHERE user_idx = ${u.idx}`);
    u.topics = foundExtraInfo.length > 0 ? foundExtraInfo : undefined;
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
	c.idx as topic_idx,
	c.name as topic_name,
	c.seq as topic_seq
FROM USER u
LEFT JOIN USER_TOPIC uc ON u.idx = uc.user_idx 
LEFT JOIN TOPIC c ON uc.topic_idx = c.idx 
WHERE u.idx = ${idx}
AND u.del_at is NULL`);
  if (foundUsers.length <= 0) {
    throw new NotFoundError(`user not found`)
  }

  // get extra info
  const topics = await conn.query(`SELECT * FROM USER_TOPIC WHERE user_idx = ${idx}`);

  const user: UserDto = new UserDto(foundUsers);

  respond(res, 200, user);
}

export async function deleteUser(conn: any, req: Request, res: Response, next: NextFunction) {
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

    const cateResult = await conn.query(`DELETE FROM USER_TOPIC WHERE user_idx=${idx}`);
    logger.debug({ res: cateResult }, 'DB response');

    await conn.commit();
  } catch (e) {
    await conn.rollback()
    next(e);
  }
  respond(res, 200);
}
