# lambda-edge-authorizers

[![NPM](https://badge.fury.io/js/lambda-edge-authorizers.svg)](https://npm.im/lambda-edge-authorizers)
[![Test](https://github.com/someimportantcompany/lambda-edge-authorizers/actions/workflows/test.yml/badge.svg?branch=main&event=push)](https://github.com/someimportantcompany/lambda-edge-authorizers/actions/workflows/test.yml)

A library to intercept Cloudfront `viewer-request` events & redirect the visitor to an authentication provider if they are not signed-in.

- Must be deployed as a Lambda@Edge function, see limitations belows
- Supports any Oauth2 provider, with optional ID token support for more features
- Includes helper functions for popular providers:

Provider | Documentation
---- | ----
[Auth0](#auth0) | [`auth0.com/docs/get-started`][auth0-getting-started]

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
const { createOauthProvider } = require('lambda-edge-authorizers');

const authorizer = createOauthProvider({
  oauthClientId: 'your-oauth-client-id',
  oauthClientSecret: 'your-oauth-client-secret',
  oauthAuthorize: {
    url: 'https://your-oauth-provider.local/authorize',
    query: {
      scope: 'openid email',
    },
  },
  oauthTokenExchange: {
    url: 'https://your-oauth-provider.local/oauth/token',
  },
  oauthIdToken: {
    jwksUrl: 'https://your-oauth-provider.local/.well-known/jwks.json',
  },
});

module.exports.handler = async function handler(event) {
  const { request } = event.Records[0].cf;
  const { response } = await authorizer(request);
  return response || request;
}
```
```ts
// Typescript
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

import { createOauthProvider } from 'lambda-edge-authorizers';

const authorizer = createOauthProvider({
  oauthClientId: 'your-oauth-client-id',
  oauthClientSecret: 'your-oauth-client-secret',
  oauthAuthorize: {
    url: 'https://your-oauth-provider.local/authorize',
    query: {
      scope: 'openid email',
    },
  },
  oauthTokenExchange: {
    url: 'https://your-oauth-provider.local/oauth/token',
  },
  oauthIdToken: {
    jwksUrl: 'https://your-oauth-provider.local/.well-known/jwks.json',
  },
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

import { createOauthProvider } from 'lambda-edge-authorizers';

const authorizer = createOauthProvider({
  oauthClientId: 'your-oauth-client-id',
  oauthClientSecret: 'your-oauth-client-secret',
  // ...
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

## OAuth Authorizers

Helper functions are provided for popular providers.

### Auth0

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
  const { response } = await authorizer(request);
  return response ?? request;
}
```

Argument | Description
---- | ----
`auth0ClientId` | **Required** - Auth0 Client ID.
`auth0ClientSecret` | **Required** - Auth0 Client Secret.
`auth0Domain` | **Required** - Auth0 Tenant Domain.
`oauthAuthorize` | Optional - [Oauth Authorize](#oauthauthorize-properties) properties without `endpoint`.
`oauthTokenExchange` | Optional - [Oauth Token Exchange](#oauthtokenexchange-properties) properties without `endpoint`.
`oauthIdToken` | Optional - [Oauth ID Token](#oauthidtoken-properties) properties without `endpoint`.
`baseUrl` | Optional, defaults to `https://${req.headers.Host}` - manually set Cloudfront's own origin, used in `redirect_uri` field of requests.
`callbackEndpoint` | Optional, defaults to `/` - the path you'll end up on after authenticating.
`loginStartEndpoint` | Optional, defaults to `/auth/login` - the path to start the auth login flow.
`loginCallbackEndpoint` | Optional, defaults to `/auth/callback` - the path to continue the auth login flow.
`logoutEndpoint` | Optional, defaults to `/auth/logout` - the path to start the auth logout flow.
`cookie` | Optional, defaults to, omitted - [Cookie properties](#cookie-properties) for storing authentication details.

For more information, see [Auth0's Getting Starter][auth0-getting-started].

### Others

```ts
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

import { createOauthProvider } from 'lambda-edge-authorizers';

const authorizer = createOauthProvider({
  oauthClientId: 'your-oauth-client-id',
  oauthClientSecret: 'your-oauth-client-secret',
  oauthAuthorize: {
    url: 'https://your-oauth-provider.local/authorize',
    query: {
      scope: 'openid email',
    },
  },
  oauthTokenExchange: {
    url: 'https://your-oauth-provider.local/oauth/token',
  },
  oauthIdToken: {
    jwksUrl: 'https://your-oauth-provider.local/.well-known/jwks.json',
  },
});

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  const { response } = await authorizer(request);
  return response ?? request;
}
```

Argument | Description
---- | ----
`oauthClientId` | **Required** - Oauth Client ID
`oauthClientSecret` | **Required** - Oauth Client Secret
`oauthAuthorize` | **Required** - [Oauth Authorize](#oauthauthorize-properties) properties
`oauthTokenExchange` | **Required** - [Oauth Token Exchange](#oauthtokenexchange-properties) properties
`oauthIdToken` | Optional - [Oauth ID Token](#oauthidtoken-properties) properties
`baseUrl` | Optional, defaults to `https://${req.headers.Host}` - manually set Cloudfront's own origin, used in `redirect_uri` field of requests.
`callbackEndpoint` | Optional, defaults to `/` - the path you'll end up on after authenticating.
`loginStartEndpoint` | Optional, defaults to `/auth/login` - the path to start the auth login flow.
`loginCallbackEndpoint` | Optional, defaults to `/auth/callback` - the path to continue the auth login flow.
`logoutEndpoint` | Optional, defaults to `/auth/logout` - the path to start the auth logout flow.
`cookie` | Optional - [Cookie properties](#cookie-properties) for storing authentication details.

#### `oauthAuthorize` Properties

Argument | Description
---- | ----
`url` | **Required** - The full URL to redirect visitors.
`query` | Optional, an object to merge into the redirect query string, to be stringified with [`qs.stringify`][qs-stringify].

#### `oauthTokenExchange` Properties

Argument | Description
---- | ----
`url` | **Required** - The full URL to exchange a `code` for tokens.
`headers` | Optional, an object of request headers to merge into the token exchange request.

#### `oauthIdToken` Properties

Optionally include JWKS details so that `id_token`s can be automatically validated on each request. When enabled & an `id_token` is returned by the Oauth provider, failing to validate an `id_token` will result in a `403 Forbidden` error.

Argument | Description
---- | ----
`jwksUrl` | **Required** - The full URL to fetch JWKS keys from.
`tokenAlgorithms` | Optional - a list of valid JWT algorithms (e.g. `["HS256", "RS256"]`) to check the token for.
`headers` | Optional - an object of request headers to merge into the JWKS request.

#### `cookie` Properties

Optionally modify the cookie attached to visitors when authenticated.

Argument | Description
---- | ----
`name` | Optional, defaults to `auth` - The name of the cookie that is set.
`secret` | Optional - Encrypt the cookie value.
`domain` | Optional - enforce the cookie sits on a particular domain.
`path` | Optional, defaults to `/` - enforce the cookie sits on a particular path.
`httpOnly` | Optional, defaults to `false` - enforce the cookie cannot be read by client-side.
`sameSite` | Optional - enforce cookie Same Site policy.
`secure` | Optional - enforce the cookie can only be set on `HTTPS` connections.
`expires` | Optional - set a default expiry time (e.g. `"10m"`, `"30d"`).

### Future

We're working on bringing more providers for easier setup - [review the upcoming list here](https://github.com/someimportantcompany/lambda-edge-authorizers/issues/1).

## Notes

- There are known restrictions on [Lambda@Edge functions](https://github.com/someimportantcompany/lambda-edge-authorizers/#known-caveats-with-lambdaedge) which you should review before deciding if this fits your use-case.
- Thoughts or questions? Please [open an issue](https://github.com/someimportantcompany/lambda-edge-authorizers/issues)!



[qs-stringify]: https://www.npmjs.com/package/qs#stringify
[auth0-getting-started]: https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow
