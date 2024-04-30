# lambda-edge-authorizers

Build Lambda@Edge authorizers for authentication providers.

- [Auth0](#auth0)

## Install

```sh
$ npm install --save lambda-edge-authorizers
# or
$ yarn add lambda-edge-authorizers
```

## Usage

- Include this library as a dependency for your Lambda@Edge function.
- Create your authorizer by passing in the relevant options.
- Pass the request from the `viewer-request` event to your authorizer, and **if** it returns a response you should return that instead of the original request!

```js
// Javascript
const { createAuth0Provider } = require('lambda-edge-authorizers');

const authorizer = createAuth0Provider({
  auth0ClientId: 'your-auth0-client-id',
  auth0ClientSecret: 'your-auth0-client-secret',
  auth0Domain: 'your-auth0-tenant.auth0.com',
});

module.exports.handler = async function handler(event) {
  const { request } = event.Records[0].cf;
  const { response } = await authorizer(request);
  return response ?? request;
}
```
```ts
// Typescript
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

import { createAuth0Provider } from 'lambda-edge-authorizers';

const authorizer = createAuth0Provider({
  auth0ClientId: 'your-auth0-client-id',
  auth0ClientSecret: 'your-auth0-client-secret',
  auth0Domain: 'your-auth0-tenant.auth0.com',
});

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  const { response } = await authorizer(request);
  return response ?? request;
}
```

Or you can combine the `authorizer` with your existing logic:

```ts
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

import { createAuth0Provider } from 'lambda-edge-authorizers';

const authorizer = createAuth0Provider({
  auth0ClientId: 'your-auth0-client-id',
  auth0ClientSecret: 'your-auth0-client-secret',
  auth0Domain: 'your-auth0-tenant.auth0.com',
});

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;

  // Return early if pre-condition logic is met (e.g. public-facing route)

  const { response } = await authorizer(request);
  if (response) {
    return response;
  }

  // Further logic now that we know the visitor is authenticated

  return response ?? request;
}
```

## Authorizers

### OAuth Providers

#### Auth0

Key | Description
---- | ----
`auth0ClientId` | **Required** Auth0 Client ID
`auth0ClientSecret` | **Required** Auth0 Client Secret
`auth0Domain` | **Required** Auth0 Tenant Domain

```ts
import { createAuth0Provider } from 'lambda-edge-authorizers';

const authorizer = createAuth0Provider({
  auth0ClientId: 'your-auth0-client-id',
  auth0ClientSecret: 'your-auth0-client-secret',
  auth0Domain: 'your-auth0-tenant.auth0.com',
});
```

- <https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow>

## Recommendations

There are known restrictions on [all edge functions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-function-restrictions-all.html) & [Lambda@Edge functions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-edge-function-restrictions.html), including (lack of) environment variables. Given this, you should **bundle** your Lambda functions with secrets baked in, and restrict access to those functions where necessary. For an example used in integration tests for this library, see [lambda-example-auth0](https://github.com/someimportantcompany/lambda-edge-authorizers/tree/main/packages/lambda-example-auth0).
