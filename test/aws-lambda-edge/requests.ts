import _kebabCase from 'lodash/kebabCase';
import { randomBytes } from 'crypto';
import { stringify as qsStringify } from 'qs';
import type { CloudFrontRequest, CloudFrontRequestEvent } from 'aws-lambda';

export function createRequest(req?: {
  method?: string;
  hostname?: string;
  path?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: never;
}): CloudFrontRequest {
  const defaultHeaders = {
    Host: 'd0000000.cloudfront.local',
  };

  return {
    clientIp: '127.0.0.1',
    method: req?.method ?? 'GET',
    uri: req?.path ?? '/',
    headers: Object.entries({ ...defaultHeaders, ...req?.headers }).reduce((headers, [key, value]) => {
      const id = _kebabCase(key);
      headers[id] = Array.isArray(headers[id]) ? headers[id] : [];
      headers[id].push({ key, value });
      return headers;
    }, {} as CloudFrontRequest['headers']),
    querystring: qsStringify(req?.query),
  };
}

export function createEventFromRequest(request: CloudFrontRequest): CloudFrontRequestEvent {
  return {
    Records: [
      {
        cf: {
          config: {
            distributionId: 'E0000000000000',
            distributionDomainName: 'd0000000.cloudfront.local',
            eventType: 'viewer-request',
            requestId: randomBytes(8).toString('hex'),
          },
          request,
        },
      },
    ],
  };
}
