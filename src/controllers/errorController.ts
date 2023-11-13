import { NextFunction, Request, Response } from "express";
import pino from 'pino';
const logger = pino({ level: 'debug' });


export default function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // remove after dev done
  console.log('-------------------');
  console.log(err);
  console.log('-------------------');

  logger.debug(err, 'DB error')

  err.statusCode = err.statusCode || 500;
  res.status(err.statusCode).json({
    type: err.type,
    message: err.message,
    path: req.originalUrl,
    at: new Date()
  })
}