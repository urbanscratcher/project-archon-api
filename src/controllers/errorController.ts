import { NextFunction, Request, Response } from "express";
import pino from 'pino';
import { ZodError } from "zod";
import { BadRequestError, InternalError, UnauthenticatedError } from "../dtos/Errors";
import { NODE_ENV } from "../utils/constants";
const logger = pino({ level: 'debug' });

export default function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // only in dev     
  if (NODE_ENV === 'development') {
    console.log('-------------------');
    console.log(err);
    console.log('-------------------');
  }

  logger.debug(err, 'Any error logging')

  // validation error from zod
  if (err instanceof ZodError) err = new BadRequestError(`${err.issues.map((i) => `${i.path.join(", ") + " - "}${i.message}`).join(", ")}`)


  // jwt token error
  if (err.name === 'JsonWebTokenError') err = new UnauthenticatedError(`${err}`)
  if (err.name === 'TokenExpiredError') err = new UnauthenticatedError(`${err}`)
  if (err.name === 'SqlError') err = new InternalError('DB error')



  // default error format
  err.statusCode = err.statusCode || 500;
  res.status(err.statusCode).json({
    type: err.type,
    message: err.message,
    path: req.originalUrl,
    at: new Date()
  })
}