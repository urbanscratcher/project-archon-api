import * as Crypto from 'crypto';
import { UnprocessableError } from '../classes/Errors';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' })


const bufferEncryption = 'utf8';
const encryptionType = 'aes-256-cbc';
const encryptionEncoding = 'base64';
const secret = process.env?.AES_SECRET;

export function encryptAES256(text: string) {
  if (!secret) { throw new UnprocessableError('decryption error: secret not exist') }

  const key: Buffer = Buffer.from(secret, bufferEncryption);
  const iv: Buffer = Buffer.from(secret.slice(0, 16), bufferEncryption);
  const cipher: Crypto.Cipher = Crypto.createCipheriv(encryptionType, key, iv);
  let encrypted = cipher.update(text, bufferEncryption, encryptionEncoding);
  encrypted += cipher.final(encryptionEncoding);
  return encrypted;
}

export function decryptAES256(text: string) {
  console.log('secret!!!!!!!! ' + secret);

  if (!secret) { throw new UnprocessableError(`decryption error: secret not exist ${secret}`) }

  const key: Buffer = Buffer.from(secret, bufferEncryption);
  const iv: Buffer = Buffer.from(secret.slice(0, 16), bufferEncryption);
  const cipher: Crypto.Decipher = Crypto.createDecipheriv(encryptionType, key, iv);
  let decrypted = cipher.update(text, encryptionEncoding, bufferEncryption);
  decrypted += cipher.final(bufferEncryption);
  return decrypted;
}