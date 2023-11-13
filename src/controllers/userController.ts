import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { Dto, ListDto } from '../classes/Dto';
import { BadRequestError, DuplicationError, NotFoundError, UnauthenticatedError, UnprocessableError } from "../classes/Errors";
import { decryptAES256 } from '../utils/crypto';
import { checkRequireds, getValidatedIdx, makeUpdateSentence, nullableField, respond, toArray, toMysqlDate } from '../utils/helper';
import { createTokens } from '../utils/manageJwt';
import { asyncHandledDB } from './../utils/connectDB';
const logger = pino({ level: 'debug' });

export enum ROLE {
  ADMIN = 'admin',
  EDITOR = 'editor',
  WRITER = 'writer',
  USER = 'user'
}

class UserDto extends Dto {
  idx: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: ROLE;
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
    this.role = obj[0].role;
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

export const createUser = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {

  // parsing
  const { email, password, first_name: firstName, last_name: lastName, password_confirm: passwordConfirm } = req.body;
  const role: ROLE | null = req.body?.role || null;
  const avatar = req.body?.avatar || null;
  const jobTitle = req.body?.job_title || null;
  const biography = req.body?.biography || null;
  const careers = req.body?.careers ? toArray(req.body?.careers) : null;
  const topics = req.body?.topics ? toArray(req.body?.topics) : null;


  // required check
  checkRequireds([email, password, passwordConfirm, firstName, lastName], ['email', 'password', 'password_confirm', 'first_name', 'last_name'])

  // role check
  if (role && !(role === ROLE.USER || role === ROLE.ADMIN || role === ROLE.EDITOR || role === ROLE.WRITER)) {
    throw new BadRequestError('role is not valid')
  }

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
    decryptedPassword = decryptAES256(password);

    console.log(decryptedPassword);
  } catch (e: any) {
    e.message = 'decryption error'
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
    , role = '${role ?? ROLE.USER}'
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
})

export const getUsers = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
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
})

export const getUser = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  // parse
  const idx = getValidatedIdx(req);

  // exist check
  const foundUsers = await conn.query(`SELECT
	u.idx as idx,
	u.email as email,
	u.password as password,
	u.first_name as first_name,
	u.last_name as last_name,
	u.role as role,
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
})

export const deleteUser = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
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
})

export const updateUser = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  const idx = getValidatedIdx(req);

  // exist check
  const users = await conn.query(`SELECT * FROM USER WHERE idx=${idx} AND del_at is null`);
  if (users.length <= 0) {
    throw new NotFoundError('user not found')
  }
  const user = users[0];

  // parse
  const pastPassword = req.body?.past_password ?? null;
  const newPassword = req.body?.password ?? null;
  const newPasswordConfirm = req.body?.password_confirm ?? null;
  const firstName = req.body?.first_name ?? null;
  const lastName = req.body?.last_name ?? null;
  const avatar = req.body?.avatar ?? null;
  const jobTitle = req.body?.job_title ?? null;
  const biography = req.body?.biography ?? null;
  const careers = req.body?.careers ? JSON.stringify(toArray(req.body.careers)) : null;
  const topics = req.body?.topics ? toArray(req.body.topics) : null;

  // password required check
  if ((pastPassword || newPassword || newPasswordConfirm) && !(pastPassword && newPassword && newPasswordConfirm)) {
    throw new BadRequestError('all password info(past password, new password, new password confirm) required')
  }

  let decryptedNewPassword = '';
  if (pastPassword && newPassword && newPasswordConfirm) {
    // decrypt past password    
    let decryptedPastPassword = '';
    try {
      decryptedPastPassword = decryptAES256(pastPassword);
      decryptedNewPassword = decryptAES256(newPassword);
    } catch (e: any) {
      e.message = 'decryption error';
      next(e);
    }

    // compare
    const isMatched = await bcrypt.compare(decryptedPastPassword, user.password);
    if (!isMatched) {
      throw new UnprocessableError('passwords are not matched with the past one. cannot be updated');
    }

    // password confirm check
    if (newPassword !== newPasswordConfirm) {
      throw new BadRequestError('password should be confirmed correctly')
    }

    // past password should not be the same
    if (pastPassword === newPassword) {
      throw new DuplicationError('new password should not be the same with the existing one')
    }
  }
  // hashing new password
  const hashedPassword = decryptedNewPassword !== '' ? await bcrypt.hash(decryptedNewPassword, 12) : null;


  const updateUser = async () => {
    const nowStr = toMysqlDate();
    await conn.query(`
    UPDATE USER SET
      ${makeUpdateSentence(firstName, 'first_name')}
      ${makeUpdateSentence(lastName, 'last_name')}
      ${makeUpdateSentence(avatar, 'avatar')}
      ${makeUpdateSentence(jobTitle, 'job_title')}
      ${makeUpdateSentence(biography, 'biography')}
      ${makeUpdateSentence(hashedPassword, 'password')}
      ${makeUpdateSentence(careers, 'careers')}
      ${hashedPassword ? 'password_updated_at=' + "'" + nowStr + "'" + ',' : ''}
      updated_at='${nowStr}'
    WHERE idx = ${idx}
    `)
  }

  if (!topics) {
    await updateUser();
  }

  if (topics) {
    // topic exist check  
    for (const topicIdx of topics) {
      const topics = await conn.query(`SELECT idx FROM TOPIC WHERE idx=${topicIdx}`);
      if (topics.length <= 0) {
        throw new BadRequestError('topic not exist')
      }
    }

    // delete & insert & update (transaction)
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM USER_TOPIC WHERE user_idx = ${idx}`)
      for (const topicIdx of topics) {
        await conn.query(`INSERT INTO USER_TOPIC SET user_idx=${idx}, topic_idx=${topicIdx}`)
      }
      await updateUser();
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      next(e);
    }
  }

  respond(res, 200)

})