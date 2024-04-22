import ms from 'ms';
import * as cookie from 'cookie';
import { stringify as qsStringify } from 'qs';
import type { CloudFrontRequest, CloudFrontResultResponse } from 'aws-lambda';

interface CookieSerializeOptions extends Omit<cookie.CookieSerializeOptions, 'expires'> {
  value: string | null,
  expires?: string | undefined,
}

export function assert(value: unknown, err: unknown, additional?: Record<string, unknown>) {
  if (!value) {
    const e = err instanceof Error ? err : new Error(`${err}`);
    Object.assign(e, additional ?? {});
    throw e;
  }
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
  query?: Record<string, string> | undefined,
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

interface LogMessage {
  event?: string,
  userId?: string,
  err?: Error | unknown | string,
  [key: string]: string | number | boolean | Date | any[] | Record<string, any> | unknown,
  level?: never,
}

const showDebug = process.env.LOG_DEBUG === 'true';

function formatLog(level: string, log: LogMessage): string {
  const formatted: Record<string, any> = {};

  if (log.err instanceof Error) {
    formatted.err = {
      message: typeof log.err.message === 'string' ? log.err.message : `${log.err}`,
      stack: log.err.stack?.split('\n').map(s => s.trim()),
      ...Object.fromEntries(Object.entries(log.err).filter(([key]) => key !== 'message' && key !== 'stack')),
    };
  }

  return JSON.stringify({ level, ...log, ...formatted });
}

export function debugLog(log: LogMessage): void {
  if (showDebug) {
    console.log(formatLog('debug', log));
  }
}

export function infoLog(log: LogMessage): void {
  console.log(formatLog('info', log));
}

export function warnLog(log: LogMessage): void {
  console.log(formatLog('warn', log));
}

export function errorLog(log: LogMessage): void {
  console.log(formatLog('error', log));
}
