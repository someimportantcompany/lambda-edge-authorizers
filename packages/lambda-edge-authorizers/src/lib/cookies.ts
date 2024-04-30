import { aesEncrypt, aesDecrypt } from '@someimportantcompany/utils';

export function readCookieValue<T extends Record<string, any>>(value: string, secret?: string): T {
  if (typeof secret === 'string') {
    return JSON.parse(aesDecrypt(secret, value));
  } else {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
  }
}

export function writeCookieValue<T extends Record<string, any>>(value: T, secret?: string): string {
  if (typeof secret === 'string') {
    return aesEncrypt(secret, JSON.stringify(value));
  } else {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
  }
}
