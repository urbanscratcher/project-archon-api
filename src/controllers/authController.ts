import bcrypt from 'bcrypt';
import { CookieOptions, NextFunction, Request, Response } from 'express';
import { BadRequestError, DuplicationError, NotFoundError, UnauthenticatedError, UnauthorizedError } from '../dtos/Errors';
import { asyncHandledDB } from '../utils/connectDB';
import { JWT_ACCESS_EXPIRES_IN } from '../utils/constants';
import { decryptAES256 } from '../utils/crypto';
import { checkRequireds, isEmail, respond } from '../utils/helper';
import { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/manageJwt';

export const verifyEmail = asyncHandledDB(async (conn: any, req: Request, res: Response) => {

  // required check
  const email = req.body?.email;
  if (!email) {
    throw new BadRequestError('email is required')
  }

  // validation check
  isEmail(email);

  // DB
  const emails = await conn.query(`SELECT * FROM USER WHERE email = ? AND del_at is NULL`, email);
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

  // validation check
  isEmail(email);

  // user existance check
  const foundUsers = await conn.query(`SELECT * FROM USER WHERE email = ? AND del_at is NULL`, email);
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

  sendIssuedTokens(res, user)
})

export const sendIssuedTokens = (res: Response, user: any) => {
  const toMiliSec = (str: string) => {
    switch (str.slice(-1)) {
      case 's':
        return +str.slice(0, str.length - 1) * 1000;
      case 'm':
        return +str.slice(0, str.length - 1) * 60;
      case 'h':
        return +str.slice(0, str.length - 1) * 60 * 60;
      case 'd':
        return +str.slice(0, str.length - 1) * 60 * 60 * 24;
      default:
        return 60 * 60 * 1000;
    }
  }
  const cookieOptions: CookieOptions = {
    expires: new Date(Date.now() + toMiliSec(JWT_ACCESS_EXPIRES_IN)),
    httpOnly: true
  }

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('refresh_token', createRefreshToken({ idx: user.idx }), cookieOptions)

  respond(res, 201, createAccessToken({ idx: user.idx }))
}

export const refreshTokens = asyncHandledDB(async (conn: any, req: Request, res: Response, next: NextFunction) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken || refreshToken === '') {
    throw new BadRequestError('no token')
  }

  // verify refresh token
  const verifiedToken = await verifyRefreshToken(refreshToken);
  const idx = verifiedToken?.idx;
  if (!Number.isInteger(+idx)) {
    throw new UnauthenticatedError('no idx');
  }

  // check if user exists
  const users = await conn.query(`SELECT * FROM USER WHERE idx = ? AND del_at is NULL`, idx);
  if (users.length <= 0) {
    throw new UnauthenticatedError('user not found')
  }

  sendIssuedTokens(res, users[0])
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
  if (!Number.isInteger(+decoded?.idx) || !Number.isInteger(+decoded?.iat)) {
    throw new UnauthenticatedError('no idx and expiry date');
  }

  // user exists check
  const idx = decoded.idx;
  const users = await conn.query(`SELECT * FROM USER WHERE idx = ? AND del_at is null`, idx)
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

  if (!idx || idx < 0 || !user?.role) {
    return new UnauthenticatedError('user not exists');
  }

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
