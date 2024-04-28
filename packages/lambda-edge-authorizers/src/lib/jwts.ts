import jwt, { GetPublicKeyOrSecret, JwtPayload, VerifyOptions } from 'jsonwebtoken';
import createJwksClient, { JwksClient } from 'jwks-rsa';

export { createJwksClient };

export function verifyTokenWithJwks(
  client: JwksClient,
  token: string,
  options: VerifyOptions = {},
): Promise<Record<string, any>> {
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
        resolve({ ...(decoded as JwtPayload) });
      }
    });
  });
}