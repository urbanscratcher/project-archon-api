import jwt from 'jsonwebtoken';
import { JWT_ACCESS_EXPIRES_IN, JWT_ACCESS_SECRET, JWT_REFRESH_EXPIRES_IN, JWT_REFRESH_SECRET } from './constants';


export function createAccessToken(payload: object) {
  return {
    access_token: jwt.sign(payload, JWT_ACCESS_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRES_IN
    })
  }
}

export function createRefreshToken(payload: object) {
  const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  });
  console.log(token);
  return {
    refresh_token: token
  }
}


export async function verifyAccessToken(token: string) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_ACCESS_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  })
}

export async function verifyRefreshToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  })
}