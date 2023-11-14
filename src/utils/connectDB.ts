import dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';
import mariadb from 'mariadb';
import { DB_DATABASE, DB_HOST, DB_PORT, DB_PWD, DB_USER } from './constants';
dotenv.config({ path: '.env' })

// config ----------------------------
const pool = mariadb.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PWD,
  port: Number(DB_PORT),
  database: DB_DATABASE,
  connectionLimit: 5
});

export const asyncHandled = (fn: Function) => {
  return (async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (e) {
      next(e)
    }
  })
}

export const asyncHandledDB = (fn: Function) => {
  return (async (req: Request, res: Response, next: NextFunction) => {
    let conn;
    try {
      conn = await pool.getConnection();
      await fn(conn, req, res, next);
    } catch (e) {
      next(e)
    } finally {
      conn && await conn?.release();
    }
  })
}
