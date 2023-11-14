import dotenv from 'dotenv';
dotenv.config({ path: '.env' })

export const BASIC_COVERS_LIMIT = 3;
export const BASIC_INSIGHTS_LIMIT = 10;

export enum ROLE {
  ADMIN = 'admin',
  EDITOR = 'editor',
  WRITER = 'writer',
  USER = 'user'
}

export const NODE_ENV = process.env?.NODE_ENV ?? 'development';

export const PORT = process.env?.PORT ?? 5001;

export const DB_HOST = process.env?.DB_HOST ?? 'localhost';
export const DB_USER = process.env?.DB_USER ?? 'root';
export const DB_PWD = process.env?.DB_PWD ?? '';
export const DB_PORT = process.env?.DB_PORT ?? 3306;
export const DB_DATABASE = process.env?.DB_DATABASE ?? 'database';

export const BUFFER_ENCRYPTION = 'utf8';
export const ENCRYPTION_TYPE = 'aes-256-cbc';
export const ENCRYPTION_ENCODING = 'base64';
export const AES_SECRET = process.env?.AES_SECRET ?? '';

export const JWT_ACCESS_SECRET = process.env?.JWT_ACCESS_SECRET ?? '';
export const JWT_ACCESS_EXPIRES_IN = process.env?.JWT_ACCESS_EXPIRES_IN ?? '14d';
export const JWT_REFRESH_SECRET = process.env?.JWT_REFRESH_SECRET ?? '';
export const JWT_REFRESH_EXPIRES_IN = process.env?.JWT_REFRESH_EXPIRES_IN ?? '14d';
