import ms from 'ms';
import * as cookie from 'cookie';
import { stringify as qsStringify } from 'qs';
import type { CloudFrontRequest, CloudFrontResultResponse } from 'aws-lambda';

interface CookieSerializeOptions extends Omit<cookie.CookieSerializeOptions, 'expires'> {
  value: string | null,
  expires?: string | undefined,
}

export function concatUrl(...segments: string[]): string {
  return segments.reduce((url, next) => {
    if (next.startsWith('http://') || next.startsWith('https://')) {
      return next;
    } else if (url.endsWith('/') && next.startsWith('/')) {
      return `${url}${next.slice(1)}`;
    } else if (url.endsWith('/') || next.startsWith('/')) {
      return `${url}${next}`;
    } else {
      return `${url}/${next}`;
    }
  });
}

export function getHeader(req: CloudFrontRequest, key: string): string | undefined {
  const values = req.headers[key] ?? req.headers[key.toLowerCase()] ?? [];
  const { value } = values.find(r => r.value) ?? {};
  return value;
}

export function getMultiHeader(req: CloudFrontRequest, key: string): string[] | undefined {
  const values = req.headers[key] ?? req.headers[key.toLowerCase()] ?? undefined;
  return values?.filter(r => r.value)?.map(r => r.value);
}

export function getCookies<T extends Record<string, string>>(req: CloudFrontRequest): T {
  const values = (getMultiHeader(req, 'Cookie') ?? []).join(';');
  return cookie.parse(values) as T;
}

export function getSelfBaseUrl(req: CloudFrontRequest): string {
  const host = getHeader(req, 'Host')!;
  return `https://${host}`;
}

export function createRedirectResponse(url: string, opts?: {
  cookies?: Record<string, CookieSerializeOptions> | undefined,
  headers?: CloudFrontResultResponse['headers'] | undefined,
  query?: Record<string, string | number | boolean | undefined> | undefined,
}): CloudFrontResultResponse {
  const location = opts?.query === undefined ? url : `${url}?${qsStringify(opts!.query)}`;

  return {
    status: '302',
    statusDescription: 'Found',
    headers: {
      location: [ { key: 'Location', value: location } ],
      ...(opts?.cookies && {
        'set-cookie': Object.entries(opts.cookies).map(([ name, { value, ...opts } ]) => {
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
      ...opts?.headers,
    },
    body: `Redirecting to: ${location}`,
    bodyEncoding: 'text',
  };
}
