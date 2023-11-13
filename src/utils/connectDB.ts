import dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';
import mariadb from 'mariadb';
dotenv.config({ path: '.env' })

// config ----------------------------
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PWD = process.env.DB_PWD;
const DB_PORT = process.env.DB_PORT;
const DB_DATABASE = process.env.DB_DATABASE;


const pool = mariadb.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PWD,
  port: Number(DB_PORT),
  database: DB_DATABASE,
  connectionLimit: 5
});

async function catchAsync(req: Request, res: Response, next: NextFunction, fn: Function) {
  try {
    await fn(req, res, next);
  } catch (e) {
    next(e)
  }
}

export const asyncHandled = (fn: Function) => { return (req: Request, res: Response, next: NextFunction) => catchAsync(req, res, next, fn) }



async function catchAsyncDB(req: Request, res: Response, next: NextFunction, fn: Function) {
  let conn;
  try {
    conn = await pool.getConnection();
    await fn(conn, req, res, next);
  } catch (e) {
    next(e)
  } finally {
    conn && await conn?.release();
  }
}

export const asyncHandledDB = (fn: Function) => { return (req: Request, res: Response, next: NextFunction) => catchAsyncDB(req, res, next, fn) }
