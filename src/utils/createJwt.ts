import jwt from 'jsonwebtoken';
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