import { createOauthProvider, OauthAuthorizerOpts } from './oauth';
import { assert } from './utils';

interface OverrideAuthorizerOpts {
  oauthClientId: string,
  oauthClientSecret: string,
  oauthBaseUrl: string,
  oauthAuthorizeEndpoint?: string,
  oauthTokenEndpoint?: string,
}

export function createAuth0Provider(opts: Omit<OauthAuthorizerOpts, keyof OverrideAuthorizerOpts> & {
  auth0ClientId: string,
  auth0ClientSecret: string,
  auth0Domain: string,
}) {
  assert(!opts.auth0Domain.startsWith('http://') && !opts.auth0Domain.startsWith('https://'),
    'Expected auth0Domain to not start with http(s)://');

  return createOauthProvider({
    oauthClientId: opts.auth0ClientId,
    oauthClientSecret: opts.auth0ClientSecret,
    oauthBaseUrl: `https://${opts.auth0Domain}`,
    oauthAuthorizeEndpoint: '/authorize',
    oauthTokenEndpoint: '/oauth/token',
    ...opts,
  });
}

export function createGoogleProvider(opts: Omit<OauthAuthorizerOpts, keyof OverrideAuthorizerOpts> & {
  googleClientId: string,
  googleClientSecret: string,
}) {
  return createOauthProvider({
    oauthClientId: opts.googleClientId,
    oauthClientSecret: opts.googleClientSecret,
    oauthBaseUrl: 'https://accounts.google.com',
    oauthAuthorizeEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    oauthTokenEndpoint: 'https://oauth2.googleapis.com/token',
    ...opts,
  });
}
