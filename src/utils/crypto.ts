import * as Crypto from 'crypto';

const bufferEncryption = 'utf8';
const encryptionType = 'aes-256-cbc';
const encryptionEncoding = 'base64';
const secret = process.env?.AES_SECRET ?? '';

export function encryptAES256(secret: string, text: string): string {
  const key: Buffer = Buffer.from(secret, bufferEncryption);
  const iv: Buffer = Buffer.from(secret.slice(0, 16), bufferEncryption);
  const cipher: Crypto.Cipher = Crypto.createCipheriv(encryptionType, key, iv);
  let encrypted = cipher.update(text, bufferEncryption, encryptionEncoding);
  encrypted += cipher.final(encryptionEncoding);
  return encrypted;
}

export function decryptAES256(text: string) {
  const key: Buffer = Buffer.from(secret, bufferEncryption);
  const iv: Buffer = Buffer.from(secret.slice(0, 16), bufferEncryption);
  const cipher: Crypto.Decipher = Crypto.createDecipheriv(encryptionType, key, iv);
  let decrypted = cipher.update(text, encryptionEncoding, bufferEncryption);
  decrypted += cipher.final(bufferEncryption);
  return decrypted;
}