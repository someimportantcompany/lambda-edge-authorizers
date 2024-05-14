import { assert } from '@someimportantcompany/utils';

import { createOauthProvider, OauthAuthorizerOpts } from './oauth';

interface RemoveAuthorizerOpts {
  oauthClientId: string,
  oauthClientSecret: string,
}
interface ModifyAuthorizerOpts {
  oauthAuthorize?: Omit<OauthAuthorizerOpts['oauthAuthorize'], 'url'>,
  oauthTokenExchange?: Omit<OauthAuthorizerOpts['oauthTokenExchange'], 'url'>,
  oauthIdToken?: Omit<OauthAuthorizerOpts['oauthIdToken'], 'jwksUrl' | 'jwtSecret'>,
}

interface GenericAuthorizerOpts extends
  Omit<OauthAuthorizerOpts, keyof RemoveAuthorizerOpts | keyof ModifyAuthorizerOpts>,
  ModifyAuthorizerOpts {}

export interface Auth0AuthorizerOpts extends GenericAuthorizerOpts {
  auth0ClientId: string,
  auth0ClientSecret: string,
  auth0Domain: string,
  auth0Scopes?: string[],
}

export function createAuth0Provider(opts: Auth0AuthorizerOpts) {
  assert(!opts.auth0Domain.startsWith('http://') && !opts.auth0Domain.startsWith('https://'),
    'Expected auth0Domain to not start with http(s)://');

  return createOauthProvider({
    oauthClientId: opts.auth0ClientId,
    oauthClientSecret: opts.auth0ClientSecret,
    ...opts,

    oauthAuthorize: {
      ...opts.oauthAuthorize,
      url: `https://${opts.auth0Domain}/authorize`,
      query: {
        scope: [ 'openid', 'email' ].concat(opts.auth0Scopes ?? []).join(' '),
        ...opts.oauthAuthorize?.query,
      },
    },
    oauthTokenExchange: {
      url: `https://${opts.auth0Domain}/oauth/token`,
      ...opts.oauthTokenExchange,
    },
    oauthIdToken: {
      required: true,
      jwksUrl: `https://${opts.auth0Domain}/.well-known/jwks.json`,
      ...opts.oauthIdToken,
      jwtSecret: undefined,
    },
  });
}

export interface GoogleAuthorizerOpts extends GenericAuthorizerOpts {
  googleClientId: string,
  googleClientSecret: string,
  googleScopes: string[],
}

export function createGoogleProvider(opts: GoogleAuthorizerOpts) {
  return createOauthProvider({
    oauthClientId: opts.googleClientId,
    oauthClientSecret: opts.googleClientSecret,
    ...opts,

    oauthAuthorize: {
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      ...opts.oauthAuthorize,
    },
    oauthTokenExchange: {
      url: 'https://oauth2.googleapis.com/token',
      ...opts.oauthTokenExchange,
    },
    oauthIdToken: {
      required: true,
      jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
      ...opts.oauthIdToken,
      jwtSecret: undefined,
    },
  });
}
