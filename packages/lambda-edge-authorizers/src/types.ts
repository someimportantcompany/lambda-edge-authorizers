import type { CloudFrontRequest, CloudFrontResultResponse } from 'aws-lambda';
import type { CookieSerializeOptions } from 'cookie';

export interface CookieOpts {
  name?: string,
  secret?: string,

  domain?: CookieSerializeOptions['domain'],
  path?: CookieSerializeOptions['path'],
  httpOnly?: CookieSerializeOptions['httpOnly'],
  sameSite?: CookieSerializeOptions['sameSite'],
  secure?: CookieSerializeOptions['secure'],

  /**
   * Specifies an time offset to be the value for the {@link https://tools.ietf.org/html/rfc6265#section-5.2.1|`Expires` `Set-Cookie` attribute} -
   * passed into {@link https://npm.im/ms|`ms`}.
   * By default, no expiration is set, and most clients will consider this a "non-persistent cookie" and will delete it
   * on a condition like exiting a web browser application.
   *
   * @example "10m"
   */
  expires?: string | undefined,
}

export interface AuthorizerFn {
  (request: CloudFrontRequest): Promise<{
    response: CloudFrontResultResponse | undefined,
  }>,
}
