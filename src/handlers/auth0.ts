import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

import { handleAuth0Authorizer } from '../lib/auth0';

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  const response = await handleAuth0Authorizer(request);
  return response ?? request;
}
