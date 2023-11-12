import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { Dto, ListDto } from '../classes/Dto';
import { BadRequestError, DuplicationError, NotFoundError } from "../classes/Errors";
import { getValidatedIdx, checkRequireds, nullableField, respond, toArray, toMysqlDate } from '../utils/helper';
const logger = pino({ level: 'debug' });


export class UserDto extends Dto {
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
  createdAt: string;

  constructor(obj: any) {
    super();
    this.idx = obj.idx;
    this.email = obj.email;
    this.password = obj.password;
    this.firstName = obj.first_name;
    this.lastName = obj.last_name;
    this.isAdmin = obj.is_admin;
    this.avatar = obj.avatar ?? undefined;
    this.jobTitle = obj.job_title ?? undefined;
    this.biography = obj.biography ?? undefined;
    this.careers = obj.careers ? obj.careers.replace(/"/g, "'") : undefined;
    this.createdAt = obj.created_at.toISOString();
  }
}


export async function createUser(conn: any, req: Request, res: Response) {
  // parsing
  const { email, password, first_name: firstName, last_name: lastName } = req.body;
  const isAdmin = Boolean(req.body.is_admin);
  const avatar = req.body?.avatar || null;
  const jobTitle = req.body?.job_title || null;
  const biography = req.body?.biography || null;
  const careers = req.body?.careers ? toArray(req.body?.careers) : null;

  // required check
  checkRequireds([email, password, firstName, lastName, req.body?.is_admin], ['email', 'password', 'first_name', 'last_name', 'is_admin'])

  // DB
  const result = await conn.query(`INSERT INTO USER (email, password, first_name, last_name, is_admin, avatar, job_title, biography, careers, created_at) values ('${email}', '${password}', '${firstName}', '${lastName}', ${isAdmin}, ${nullableField(avatar)}, ${nullableField(jobTitle)}, ${nullableField(biography)}, ${careers ? "'" + JSON.stringify(careers) + "'" : 'NULL'}, '${toMysqlDate()}')`);
  logger.debug({ res: result }, 'DB response');

  respond(res, 201);
}

export async function getUsers(conn: any, req: Request, res: Response) {
  // DB
  const foundUsers = await conn.query(`SELECT * FROM USER WHERE del_at is NULL`);

  // stringify
  const users: Array<UserDto> = foundUsers.map((user: any) => new UserDto(user))
  const userList: ListDto<UserDto> = new ListDto(users, users.length)

  respond(res, 200, userList);
}

export async function getUser(conn: any, req: Request, res: Response) {
  // parse
  const idx = getValidatedIdx(req);

  // exist check
  const foundUsers = await conn.query(`SELECT * FROM USER WHERE idx = ${idx} AND del_at is NULL`);
  if (foundUsers.length <= 0) {
    throw new NotFoundError(`user not found`)
  }

  const user: UserDto = new UserDto(foundUsers[0]);

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
  const result = await conn.query(`UPDATE USER SET del_at = '${toMysqlDate()}' WHERE idx = ${idx}`);
  logger.debug({ res: result }, 'DB response');

  respond(res, 200);
}
