import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

import { creatStandaloneProvider } from 'lambda-edge-authorizers';

const authorizer = creatStandaloneProvider({
  logins: {
    root: {
      password: 'correct-horse-battery-staple',
      profile: { displayName: 'ROOT' },
    },
  },
  cookie: {
    secret: 'be9a8bfe32efbe608564adccf62fc2b5',
  },
});

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  const { response } = await authorizer(request);
  return response ?? request;
}
