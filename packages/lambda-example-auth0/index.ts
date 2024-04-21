import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

import { handleAuth0Authorizer, Auth0AuthorizerOpts } from 'lambda-edge-authorizers';

const opts: Auth0AuthorizerOpts = {
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  domain: process.env.AUTH0_DOMAIN!,
};

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  console.log(JSON.stringify({ event, request }));

  const response = await handleAuth0Authorizer(request, opts);

  return response ?? request;
}
