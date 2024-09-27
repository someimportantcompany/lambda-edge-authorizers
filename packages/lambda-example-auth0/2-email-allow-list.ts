import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

import { createAuth0Provider, createErrorResponse } from 'lambda-edge-authorizers';

const authorizer = createAuth0Provider({
  auth0ClientId: process.env.AUTH0_CLIENT_ID!,
  auth0ClientSecret: process.env.AUTH0_CLIENT_SECRET!,
  auth0Domain: process.env.AUTH0_DOMAIN!,
  cookie: {
    secret: 'be9a8bfe32efbe608564adccf62fc2b5',
  },
});

const emailAllowedDomains = ['@someimportantcompany.com'];

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  const { response, idTokenPayload } = await authorizer(request);

  if (idTokenPayload) {
    // At this point, the user is authenticated via the auth provider.
    const email = typeof idTokenPayload.email === 'string' ? idTokenPayload.email : undefined;

    if (email) {
      // If the id_token contains `email` then check if the email domain is allowed here
      const allowed = emailAllowedDomains.find((domain) => email.endsWith(`@${domain}`));
      if (allowed === undefined) {
        // If the email has an invalid domain name, extract the domain name & pop it in an error message
        const invalid = email.split('@').pop() ?? 'example.com';
        // And return a suitable Cloudfront response
        return createErrorResponse('400', {
          message: `Your email address ending with @${invalid} is not allowed here.`,
          code: 'EMAIL_DOMAIN_NOT_ALLOWED',
        });
      }
    } else {
      return createErrorResponse('500', {
        message: 'Missing email claim from id_token',
        code: 'ID_TOKEN_NO_EMAIL_CLAIM',
      });
    }
  }

  return response ?? request;
}
