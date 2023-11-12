import dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';
import mariadb from 'mariadb';
import pino from 'pino';
const logger = pino({ level: 'debug' });
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


export async function connectDB(req: Request, res: Response, next: NextFunction, fn: Function) {
  let conn;
  try {
    conn = await pool.getConnection();
    await fn(conn, req, res);
  } catch (e) {
    next(e)
  } finally {
    conn && conn.release();
  }
}