import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import pino from 'pino';
import { BadRequestError, DuplicationError, NotFoundError, UnauthenticatedError } from '../classes/Errors';
import { checkRequireds, respond } from '../utils/helper';
import { decryptAES256, encryptAES256 } from '../utils/crypto';
import { createTokens } from '../utils/createJwt';
const logger = pino({ level: 'debug' });

export async function verifyEmail(conn: any, req: Request, res: Response) {

  const email = req.body?.email;
  if (!email) {
    throw new BadRequestError('email is required')
  }

  const emails = await conn.query(`SELECT * FROM USER WHERE email = '${email}'`);
  if (emails.length > 0) {
    throw new DuplicationError('email already exists')
  }

  respond(res, 201)
}

export async function signIn(conn: any, req: Request, res: Response, next: NextFunction) {
  // parse
  const { email, password } = req.body;

  // required check
  checkRequireds([email, password], ['email', 'password']);

  // user existance check
  const foundUsers = await conn.query(`SELECT * FROM USER WHERE email='${email}'`);
  if (foundUsers.length <= 0) {
    throw new NotFoundError('user not found')
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

  // password check
  const user = foundUsers[0];
  const isMatched = await bcrypt.compare(decryptedPassword, user.password);

  if (!isMatched) {
    throw new UnauthenticatedError('passwords are not matched');
  }

  respond(res, 201, createTokens({ idx: user.idx }))
}
