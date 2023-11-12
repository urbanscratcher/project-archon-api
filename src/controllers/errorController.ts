import { NextFunction, Request, Response } from "express";

export default function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.log('-------------------');
  console.log(err);
  console.log('-------------------');
  err.statusCode = err.statusCode || 500;

  res.status(err.statusCode).json({
    type: err.type,
    message: err.message,
    path: req.originalUrl,
    at: new Date()
  })
}