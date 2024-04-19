import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

// import { handleAuth0Authorizer } from 'lambda-edge-authorizers';

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  console.log(JSON.stringify({ event, request }));
  return request;
}
