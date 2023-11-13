import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' })

const jwtAccessSecret = process.env?.JWT_ACCESS_SECRET ?? '';
const jwtAccessExpiresIn = process.env?.JWT_ACCESS_EXPIRES_IN ?? '14d';
const jwtRefreshSecret = process.env?.JWT_REFRESH_SECRET ?? '';
const jwtRefreshExpiresIn = process.env?.JWT_REFRESH_EXPIRES_IN ?? '14d';

function createAccessToken(payload: object) {
  return jwt.sign(payload, jwtAccessSecret, {
    expiresIn: jwtAccessExpiresIn
  });
}

function createRefreshToken(payload: object) {
  return jwt.sign(payload, jwtRefreshSecret, {
    expiresIn: jwtRefreshExpiresIn
  })
}


export function createTokens(payload: object) {
  return {
    access_token: createAccessToken(payload), refresh_token: createRefreshToken(payload)
  }
}

export function verifyAccessToken(token: string) {
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