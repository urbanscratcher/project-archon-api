import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { z } from 'zod';
import { Dto, ListDto } from '../dtos/Dto';
import { BadRequestError, DuplicationError, NotFoundError, UnauthenticatedError, UnprocessableError } from "../dtos/Errors";
import { QueryReqSchema } from '../dtos/Query';
import { ROLE } from '../utils/constants';
import { decryptAES256 } from '../utils/crypto';
import { getValidIdx, isEmailMessage, isEmailType, isNoSpecialOrBlankMessage, isNotSpecialOrBlank, isSpecialOrBlank, respond, toArray, toCamelCase, toFilterSql, toMysqlDate, toSortsSql } from '../utils/helper';
import { asyncHandledDB } from './../utils/connectDB';
import { BASIC_USERS_LIMIT } from './../utils/constants';
import { sendIssuedTokens } from './authController';
const logger = pino({ level: 'debug' });

class UserDto extends Dto {
  idx: number;
  email: string;
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

export const ROLES = ['admin', 'editor', 'writer', 'user'] as const;

const UserReqSchema = z.object({
  email: z.string().refine(isEmailType, isEmailMessage),
  password: z.string(),
  password_confirm: z.string(),
  first_name: z.string().refine(isNotSpecialOrBlank, isNoSpecialOrBlankMessage),
  last_name: z.string().refine(isNotSpecialOrBlank, isNoSpecialOrBlankMessage),
  role: z.enum(ROLES).optional(),
  avatar: z.string().optional(),
  job_title: z.string().optional(),
  biography: z.string().optional(),
  careers: z.string().transform
    (val => toArray(val)).optional(),
  topics: z.string().transform(val => toArray(val)).optional(),
})
  .transform((data) => toCamelCase(data))
export type UserType = z.infer<typeof UserReqSchema>;


const UserDBSchema = z.object({
  idx: z.number(),
  email: z.string(),
  password: z.string().transform(val => undefined),
  first_name: z.string(),
  last_name: z.string(),
  role: z.enum(ROLES).optional(),
  avatar: z.string().optional(),
  job_title: z.string().optional(),
  biography: z.string().optional(),
})


export const createUser = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  const user = UserReqSchema.parse(req.body)

  // password confirm check
  if (user.password !== user.passwordConfirm) {
    throw new UnauthenticatedError('password is not matched')
  }

  // email duplication check
  const emails = await conn.query(`SELECT * FROM USER WHERE email = ? AND del_at is null`, user.email);
  if (emails.length > 0) {
    throw new DuplicationError('email already exists')
  }

  // AES256 decryption
  let decryptedPassword = '';
  try {
    decryptedPassword = decryptAES256(user.password);
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
    email = ?
    , password = ?
    , first_name = ?
    , last_name = ?
    , role = ?
    , avatar = ?
    , job_title = ?
    , biography = ?
    , careers = ?
    , created_at = ?`,
      [user.email, hashedPassword, user.firstName, user.lastName,
      user.role ?? ROLE.USER,
      user.avatar, user.jobTitle, user.biography,
      user.careers ? "'" + JSON.stringify(user.careers) + "'" : null, toMysqlDate()
      ]);
    logger.debug({ res: result }, 'DB response');
    const insertedIdx = Number(result.insertId);

    if (user.topics) {
      for (const topicIdx of user.topics) {
        const topic = await conn.query(`SELECT * FROM TOPIC WHERE idx = ?`, topicIdx);

        if (topic.length <= 0) {
          throw new NotFoundError(`topic not exist`);
        }
      }

      user.topics.forEach(async (topicIdx: number) => {
        const cateResult = await conn.query(`INSERT INTO USER_TOPIC (user_idx, topic_idx) values (?, ?)`, [insertedIdx, topicIdx]);
        logger.debug({ res: cateResult }, 'DB response');
      })
    }
    await conn.commit();

    // create jwt tokens
    sendIssuedTokens(res, { idx: insertedIdx });
  } catch (e) {
    await conn.rollback();
    next(e);
  }
})


export const getUsers = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  // query transform
  const query = QueryReqSchema(BASIC_USERS_LIMIT).parse(req.query)
  const sortsSql = query?.sorts && toSortsSql(query.sorts, ["idx", 'first_name', 'last_name', "role", "created_at", "email"]);
  const filterSql = query?.filter && toFilterSql(query.filter, ["idx", 'first_name', 'last_name', "role", "email"])

  // DB
  const foundUsers = await conn.query(`
    SELECT
      tt.total total, tb.*
    FROM
      ( SELECT COUNT(*) total FROM USER WHERE del_at is NULL ) tt,
      ( 
        SELECT * FROM USER
        WHERE del_at is NULL
        ${filterSql ? 'AND ' + filterSql : ''}
        ORDER BY ${sortsSql ? sortsSql + ',' : ''} idx DESC
        LIMIT ? OFFSET ?
      ) tb  
    `, [query.limit, query.offset]);
  const total = foundUsers.length > 0 ? Number(foundUsers[0].total) : 0;

  // stringify
  const users: UserDto[] = foundUsers.map((user: any) => new UserDto([user]));

  const usersWithExtraInfo = [];
  for (let u of users) {
    const foundExtraInfo = await conn.query(`
        SELECT
          c.idx as idx,
          c.name as name,
          c.seq as seq
        FROM USER_TOPIC uc
        LEFT JOIN TOPIC c ON uc.topic_idx  = c.idx
        WHERE user_idx = ?`, u.idx);
    u.topics = foundExtraInfo.length > 0 ? foundExtraInfo : undefined;
    usersWithExtraInfo.push(u);
  }

  const userList: ListDto<any> = new ListDto(usersWithExtraInfo, total, query.offset, query.limit)

  respond(res, 200, userList);
})

export const getUser = asyncHandledDB(async (conn: any, req: Request, res: Response) => {
  // parse
  const idx = getValidIdx(req);

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
  WHERE u.idx = ?
  AND u.del_at is NULL`, idx);
  if (foundUsers.length <= 0) {
    throw new NotFoundError(`user not found`)
  }

  const user: UserDto = new UserDto(foundUsers);

  respond(res, 200, user);
})

export const deleteUser = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  // parse
  const idx = getValidIdx(req);

  // exist check
  const foundUsers = await conn.query(`SELECT * FROM USER WHERE idx = ? AND del_at is NULL`, idx);
  if (foundUsers.length <= 0) {
    throw new NotFoundError(`user not found`)
  }

  // DB
  const result = await conn.query(`UPDATE USER SET del_at = ? WHERE idx = ?`, [toMysqlDate(), idx]);
  logger.debug({ res: result }, 'DB response');

  respond(res, 200);
})

export const updateUser = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  const idx = getValidIdx(req);

  // exist check
  const users = await conn.query(`SELECT * FROM USER WHERE idx = ? AND del_at is null`, idx);
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
  const careers = req.body?.careers ? toArray(req.body.careers) : null;
  const topics = req.body?.topics ? toArray(req.body.topics) : null;

  // password required check
  if ((pastPassword || newPassword || newPasswordConfirm) && !(pastPassword && newPassword && newPasswordConfirm)) {
    throw new BadRequestError('all password info(past password, new password, new password confirm) required')
  }

  // validation check
  firstName && isSpecialOrBlank(firstName);
  lastName && isSpecialOrBlank(lastName);

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
    const now = toMysqlDate();
    await conn.query(`
    UPDATE USER SET
      first_name = ?,
      last_name = ?,
      avatar = ?,
      job_title = ?,     
      biography = ?,
      password = ?,
      careers = ?,
      password_updated_at = ?,      
      updated_at = ?
    WHERE idx = ?`,
      [
        firstName ?? user.first_name,
        lastName ?? user.last_name,
        avatar ?? user.avatar,
        jobTitle ?? user.job_title,
        biography ?? user.biography,
        hashedPassword ?? user.password,
        careers ?
          careers.length > 0 ? JSON.stringify(careers) : null
          : user.careers,
        hashedPassword ? now : null,
        now,
        idx
      ])
  }

  if (!topics) {
    await updateUser();
  }

  if (topics) {
    // topic exist check  
    for (const topicIdx of topics) {
      const topics = await conn.query(`SELECT idx FROM TOPIC WHERE idx = ?`, topicIdx);
      if (topics.length <= 0) {
        throw new BadRequestError('topic not exist')
      }
    }

    // delete & insert & update (transaction)
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM USER_TOPIC WHERE user_idx = ?`, idx)
      for (const topicIdx of topics) {
        await conn.query(`INSERT INTO USER_TOPIC SET user_idx = ?, topic_idx = ?`, [idx, topicIdx])
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