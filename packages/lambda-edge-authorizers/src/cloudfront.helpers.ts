import ms from 'ms';
import statuses from 'statuses';
import * as cookie from 'cookie';
import type { CloudFrontResultResponse } from 'aws-lambda';

import { renderErrorPage } from './lib/template';
import type { CookieSerializeOptions } from './lib/req';

export function createResponse(res: {
  status: `${number}`,
  headers?: CloudFrontResultResponse['headers'] | undefined,
  cookies?: Record<string, CookieSerializeOptions> | undefined,
  body?: string | undefined,
}): CloudFrontResultResponse {
  return {
    status: res.status,
    statusDescription: statuses(res.status),
    headers: {
      ...(res?.cookies && {
        'set-cookie': Object.entries(res.cookies).map(([ name, { value, ...opts } ]) => {
          const expiresInSecs = typeof opts.expires === 'string' ? ms(opts.expires) : undefined;

          const expires = (value !== null && expiresInSecs !== undefined)
            ? new Date(Date.now() + expiresInSecs)
            : undefined;
          const maxAge = (value !== null && expiresInSecs !== undefined)
            ? Math.floor(expiresInSecs / 1000)
            : undefined;

          return {
            key: 'Set-Cookie',
            value: value === null
              ? cookie.serialize(name, 'deleted', { ...opts, expires: new Date(0) })
              : cookie.serialize(name, value, { ...opts, expires, maxAge }),
          };
        }),
      }),
      ...res?.headers,
    },
    ...(typeof res.body === 'string' && {
      body: res.body,
      bodyEncoding: 'text',
    }),
  };
}

export function createErrorResponse(status: `${number}`, err: { message: string, code?: string }) {
  return createResponse({
    status,
    headers: { 'content-type': [ { key: 'Content-Type', value: 'text/html' } ] },
    body: renderErrorPage(err),
  })
}
