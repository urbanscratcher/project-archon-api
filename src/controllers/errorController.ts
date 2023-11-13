import { NextFunction, Request, Response } from "express";
import pino from 'pino';
import { InternalError, UnauthenticatedError } from "../classes/Errors";
const logger = pino({ level: 'debug' });

export default function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // remove after dev done
  console.log('-------------------');
  console.log(err);
  console.log('-------------------');
  logger.debug(err, 'Any errors logging')

  // jwt token error
  if (err.name === 'JsonWebTokenError') err = new UnauthenticatedError(`${err}`)
  if (err.name === 'TokenExpiredError') err = new UnauthenticatedError(`${err}`)



  // default error format
  err.statusCode = err.statusCode || 500;
  res.status(err.statusCode).json({
    type: err.type,
    message: err.message,
    path: req.originalUrl,
    at: new Date()
  })
}