import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' })

const jwtAccessSecret = process.env?.JWT_ACCESS_SECRET ?? '';
export const jwtAccessExpiresIn = process.env?.JWT_ACCESS_EXPIRES_IN ?? '14d';
const jwtRefreshSecret = process.env?.JWT_REFRESH_SECRET ?? '';
const jwtRefreshExpiresIn = process.env?.JWT_REFRESH_EXPIRES_IN ?? '14d';

export function createAccessToken(payload: object) {
  return {
    access_token: jwt.sign(payload, jwtAccessSecret, {
      expiresIn: jwtAccessExpiresIn
    })
  }
}

export function createRefreshToken(payload: object) {
  const token = jwt.sign(payload, jwtRefreshSecret, {
    expiresIn: jwtRefreshExpiresIn
  });
  console.log(token);
  return {
    refresh_token: token
  }
}


export async function verifyAccessToken(token: string) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtAccessSecret, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  })
}

export async function verifyRefreshToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtRefreshSecret, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  })
}