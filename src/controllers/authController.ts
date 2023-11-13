import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import { BadRequestError, DuplicationError, NotFoundError, UnauthenticatedError, UnauthorizedError } from '../classes/Errors';
import { asyncHandledDB } from '../utils/connectDB';
import { decryptAES256 } from '../utils/crypto';
import { checkRequireds, respond } from '../utils/helper';
import { createTokens, verifyAccessToken } from '../utils/manageJwt';

export const verifyEmail = asyncHandledDB(async (conn: any, req: Request, res: Response) => {

  const email = req.body?.email;
  if (!email) {
    throw new BadRequestError('email is required')
  }

  const emails = await conn.query(`SELECT * FROM USER WHERE email = '${email}'`);
  if (emails.length > 0) {
    throw new DuplicationError('email already exists')
  }

  respond(res, 201)
})

export const signIn = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
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
    decryptedPassword = decryptAES256(password);
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
})

export const authenticate = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  // parse
  const authorization = req.headers?.authorization;

  // required check
  if (!authorization || !authorization.startsWith('Bearer')) {
    throw new UnauthenticatedError('authorization required')
  }

  const token = authorization.split(' ')[1]

  if (!token) {
    throw new UnauthenticatedError('tokens required')
  }

  // verify tokens
  const decoded: any = await verifyAccessToken(token);

  // user exists check
  const idx = decoded?.idx;
  const users = await conn.query(`SELECT * FROM USER WHERE idx = ${idx} AND del_at is null`)
  if (users.length <= 0) {
    throw new UnauthenticatedError('user not exists')
  }
  const user = users[0];

  // password changed check
  const passwordUpdatedAt = user?.password_updated_at;

  if (passwordUpdatedAt) {
    const updatedAt: any = (new Date(passwordUpdatedAt)).getTime() / 1000
    if (decoded.iat < updatedAt) {
      throw new UnauthenticatedError('User recently changed password. Signin again.')
    }
  }

  // grant access to protected route
  req.userIdx = idx;
  req.userRole = user.role;
  next()
})

export const authorize = (...roles: any[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.userRole;
    if (!roles.includes(userRole)) {
      throw new UnauthorizedError('user has no permission')
    }
    next();
  }
}