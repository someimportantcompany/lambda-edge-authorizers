import jwt, { GetPublicKeyOrSecret, VerifyOptions } from 'jsonwebtoken';
import createJwksClient, { JwksClient } from 'jwks-rsa';

export { createJwksClient };

export function decodeToken<T extends Record<string, any>>(token: string, options: VerifyOptions = {}):
T | undefined {
  const payload: T | undefined = (jwt.decode(token, options) ?? undefined) as unknown as (T | undefined);
  return payload;
}

export function verifyTokenWithSecret<T extends Record<string, any>>(
  secret: string,
  token: string,
  options: VerifyOptions = {},
): T {
  return jwt.verify(token, secret, options) as T;
}

export function verifyTokenWithJwks<T extends Record<string, any>>(
  client: JwksClient,
  token: string,
  options: VerifyOptions = {},
): Promise<T> {
  const getKey: GetPublicKeyOrSecret = (header, callback): void => {
    client.getSigningKey(header.kid, function(err, key) {
      if (err) {
        callback(err);
      } else if (!key) {
        callback(new Error('Key not found'));
      } else {
        callback(null, key.getPublicKey());
      }
    });
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, options, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as T);
      }
    });
  });
}
