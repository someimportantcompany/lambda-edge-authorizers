# lambda-edge-authorizers

[![NPM](https://badge.fury.io/js/lambda-edge-authorizers.svg)](https://npm.im/lambda-edge-authorizers)
[![Test](https://github.com/someimportantcompany/lambda-edge-authorizers/actions/workflows/test.yml/badge.svg?branch=main&event=push)](https://github.com/someimportantcompany/lambda-edge-authorizers/actions/workflows/test.yml)

A library to intercept Cloudfront `viewer-request` events & redirect the visitor to an authentication provider if they are not signed-in.

![Image](https://cdn.jsdelivr.net/gh/someimportantcompany/lambda-edge-authorizers@37739b895d43fcef4d53c760a7ab5aef3746b4f8/image.png)

- Must be deployed as a Lambda@Edge function.
- Supports:
  - Any Oauth2 provider, with optional ID token support where needed.
  - Standalone username/password logins, with hardcoded credentials.
- Includes helper functions for popular Oauth2 providers:

Provider | Documentation
---- | ----
[Auth0](#auth0) | [`auth0.com/docs/get-started`][auth0-getting-started]

## Install

```sh
$ npm install --save lambda-edge-authorizers
# or
$ yarn add lambda-edge-authorizers
```

Then drop into your Lambda@Edge function:

```ts
// Javascript
const { createOauthProvider } = require('lambda-edge-authorizers');
// or Typescript
import { createOauthProvider } from 'lambda-edge-authorizers';
```

## Usage

- Include this library as a dependency for your Lambda@Edge function.
- Create your authorizer by passing in the relevant options.
- Pass the request from the `viewer-request` event to your authorizer, and **if** it returns a response you should return that instead of the original request!

```ts
// Typescript
import { createOauthProvider } from 'lambda-edge-authorizers';
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

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
});

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  const { response } = await authorizer(request);
  return response ?? request;
}
```

Or you can combine the `authorizer` with your existing logic:

```ts
import { createOauthProvider } from 'lambda-edge-authorizers';
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

const authorizer = createOauthProvider({
  // ...
});

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;

  // Return early if pre-condition logic is met (e.g. public-facing route)
  // You could also customise a Cloudfront behaviour to avoid the Lambda@Edge function

  const { response } = await authorizer(request);
  if (response) {
    return response;
  }

  // Further logic now that we know the visitor is authenticated

  return response ?? request;
}
```

## Authorizers

### Auth0 Provider

```ts
import { createAuth0Provider } from 'lambda-edge-authorizers';
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

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
`oauthAuthorize` | Optional - [Oauth Authorize](#oauthauthorize-properties) properties without `url`.
`oauthTokenExchange` | Optional - [Oauth Token Exchange](#oauthtokenexchange-properties) properties without `url`.
`oauthIdToken` | Optional - [Oauth ID Token](#oauthidtoken-properties) properties without `jwksUrl` or `jwtSecret`.
`baseUrl` | Optional, defaults to `https://${req.headers.Host}` - see [Options](#options) for more.
`callbackEndpoint` | Optional, defaults to `/` - see [Options](#options) for more.
`loginStartEndpoint` | Optional, defaults to `/auth/login` - see [Options](#options) for more.
`loginCallbackEndpoint` | Optional, defaults to `/auth/callback` - see [Options](#options) for more.
`logoutEndpoint` | Optional, defaults to `/auth/logout` - see [Options](#options) for more.
`cookie` | Optional - see [Cookie properties](#cookie-properties) for more.

For more information, see [Auth0's Getting Starter][auth0-getting-started].

### Custom Oauth2 Provider

If you know the relevant details, you can configure any Oauth-compliant provider.

```ts
import { createOauthProvider } from 'lambda-edge-authorizers';
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

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
`baseUrl` | Optional, defaults to `https://${req.headers.Host}` - see [Options](#options) for more.
`callbackEndpoint` | Optional, defaults to `/` - see [Options](#options) for more.
`loginStartEndpoint` | Optional, defaults to `/auth/login` - see [Options](#options) for more.
`loginCallbackEndpoint` | Optional, defaults to `/auth/callback` - see [Options](#options) for more.
`logoutEndpoint` | Optional, defaults to `/auth/logout` - see [Options](#options) for more.
`cookie` | Optional - see [Cookie properties](#cookie-properties) for more.

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

Verify the `id_token` returned from the Oauth provider, either by [JWKS](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-key-sets) or a secret key.

Argument | Description
---- | ----
`required` | Optional - Set to `true` to throw an error if the Oauth provider doesn't return an ID token.
`jwksUrl` | Optional - The full URL to fetch JWKS keys from. See below for implications of skipping this.
`jwksHeaders` | Optional - an object of request headers to merge into the JWKS request. Useless without `jwksUrl`.
`jwtSecret` | Optional - Verify the `id_token` with a known secret instead of JWKS. Cannot be used together with `jwksUrl`.
`jwtVerifyOpts` | Optional - a list of valid JWT algorithms (e.g. `["HS256", "RS256"]`) to check the token for.

When `jwksUrl` or `jwtSecret` is set & an `id_token` is returned by the Oauth provider, failing to validate the `id_token` will result in a `403 Forbidden` response.

Omitting `jwksUrl` will disable ID token verification. If you omit `jwksUrl`, omit `jwtSecret` & set `required: true` then this library will **decode** `id_token` instead of ignoring it, without verification.

### Standalone Provider

If you don't want to use a 3rd-party provider, you can configure authentication using a static list of credentials.

```ts
import { creatStandaloneProvider } from 'lambda-edge-authorizers';
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

const authorizer = creatStandaloneProvider({
  logins: {
    root: {
      password: 'correct-horse-battery-staple',
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
```

Argument | Description
---- | ----
`logins` | **Required** - a collection of valid logins & optional profile data, see below.
`customise.title` | Optional - used at the title of the Login page/form.
`customise.logoUrl` | Optional - display a logo above the Login form.
`comparePassword` | Optional - a function to compare passwords, see below.
`baseUrl` | Optional, defaults to `https://${req.headers.Host}` - see [Options](#options) for more.
`callbackEndpoint` | Optional, defaults to `/` - see [Options](#options) for more.
`loginStartEndpoint` | Optional, defaults to `/auth/login` - see [Options](#options) for more.
`loginCallbackEndpoint` | Optional, defaults to `/auth/callback` - see [Options](#options) for more.
`logoutEndpoint` | Optional, defaults to `/auth/logout` - see [Options](#options) for more.
`cookie` | Optional - see [Cookie properties](#cookie-properties) for more.

**`logins`**

Logins are a map of usernames → passwords, with optional profile data that can be passed along to your `viewer-request` function on successful login.

```ts
interface Profile {
  [key: string]: unknown,
}

interface LoginProfiles {
  [username: string]: Profile & { password: string },
}
```

Once authenticated, the `profile` of the current user is returned from the `authorizer` if desired:

```ts
import { creatStandaloneProvider } from 'lambda-edge-authorizers';
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from 'aws-lambda';

const authorizer = creatStandaloneProvider({
  logins: {
    root: {
      displayName: 'ROOT',
      password: 'correct-horse-battery-staple',
    },
  },
  cookie: {
    secret: 'be9a8bfe32efbe608564adccf62fc2b5',
  },
});

export async function handler(event: CloudFrontRequestEvent): Promise<CloudFrontRequestResult> {
  const { request } = event.Records[0].cf;
  const { response, profile } = await authorizer(request);

  if (response) {
    return response;
  }

  if (profile) {
    request.headers['x-authed-displayname'] = [{
      key: 'X-Authed-DisplayName',
      value: profile.displayName,
    }];
  }

  return request;
}
```

## Options

Argument | Description
---- | ----
`baseUrl` | Optional, defaults to `https://${req.headers.Host}` - see [Options](#options) for more.
`callbackEndpoint` | Optional, defaults to `/` - see [Options](#options) for more.
`loginStartEndpoint` | Optional, defaults to `/auth/login` - see [Options](#options) for more.
`loginCallbackEndpoint` | Optional, defaults to `/auth/callback` - see [Options](#options) for more.
`logoutEndpoint` | Optional, defaults to `/auth/logout` - see [Options](#options) for more.
`cookie` | Optional - see [Cookie properties](#cookie-properties) for more.

### `cookie` Properties

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
