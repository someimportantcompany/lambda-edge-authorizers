import * as cookie from 'cookie';
import type { CloudFrontRequest } from 'aws-lambda';

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

interface LogMessage {
  event?: string,
  userId?: string,
  [key: string]: string | number | boolean | Date | any[] | Record<string, any>,
  level?: never,
}

const showDebug = process.env.LOG_DEBUG === 'true';

export function debugLog(log: LogMessage): void {
  if (showDebug) {
    console.log(JSON.stringify({ level: 'debug', ...log }));
  }
}

export function infoLog(log: LogMessage): void {
  console.log(JSON.stringify({ level: 'info', ...log }));
}

export function warnLog(log: LogMessage): void {
  console.log(JSON.stringify({ level: 'warn', ...log }));
}

export function errorLog(log: LogMessage): void {
  console.log(JSON.stringify({ level: 'error', ...log }));
}
