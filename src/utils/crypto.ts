import * as Crypto from 'crypto';
import { UnprocessableError } from '../dtos/Errors';
import { AES_SECRET, BUFFER_ENCRYPTION, ENCRYPTION_ENCODING, ENCRYPTION_TYPE } from './constants';


export function encryptAES256(text: string) {
  if (!AES_SECRET) { throw new UnprocessableError('decryption error: secret not exist') }

  const key: Buffer = Buffer.from(AES_SECRET, BUFFER_ENCRYPTION);
  const iv: Buffer = Buffer.from(AES_SECRET.slice(0, 16), BUFFER_ENCRYPTION);
  const cipher: Crypto.Cipher = Crypto.createCipheriv(ENCRYPTION_TYPE, key, iv);
  let encrypted = cipher.update(text, BUFFER_ENCRYPTION, ENCRYPTION_ENCODING);
  encrypted += cipher.final(ENCRYPTION_ENCODING);
  return encrypted;
}

export function decryptAES256(text: string) {
  if (!AES_SECRET) { throw new UnprocessableError(`decryption error: secret not exist ${AES_SECRET}`) }

  const key: Buffer = Buffer.from(AES_SECRET, BUFFER_ENCRYPTION);
  const iv: Buffer = Buffer.from(AES_SECRET.slice(0, 16), BUFFER_ENCRYPTION);
  const cipher: Crypto.Decipher = Crypto.createDecipheriv(ENCRYPTION_TYPE, key, iv);
  let decrypted = cipher.update(text, ENCRYPTION_ENCODING, BUFFER_ENCRYPTION);
  decrypted += cipher.final(BUFFER_ENCRYPTION);
  return decrypted;
}