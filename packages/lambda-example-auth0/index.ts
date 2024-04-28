import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

import { createAuth0Provider } from 'lambda-edge-authorizers';

const authorizer = createAuth0Provider({
  auth0ClientId: process.env.AUTH0_CLIENT_ID!,
  auth0ClientSecret: process.env.AUTH0_CLIENT_SECRET!,
  auth0Domain: process.env.AUTH0_DOMAIN!,
  cookie: {
    secret: 'be9a8bfe32efbe608564adccf62fc2b5',
    httpOnly: true,
    secure: true,
  },
});

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  const response = await authorizer(request);
  return response ?? request;
}
