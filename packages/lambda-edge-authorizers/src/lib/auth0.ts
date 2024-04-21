import type { CloudFrontRequest, CloudFrontResponse } from 'aws-lambda';

import { getCookies, infoLog } from '../utils';

export interface Auth0AuthorizerOpts {
  clientId: string,
  clientSecret: string,
  domain: string,

  callbackPath?: string,
  loginStartPath?: string,
  loginCallbackPath?: string,
  logoutPath?: string,
}

export async function handleAuth0Authorizer(req: CloudFrontRequest, opts: Auth0AuthorizerOpts):
Promise<CloudFrontResponse | undefined> {
  const config: Auth0AuthorizerOpts = {
    callbackPath: '/',
    loginStartPath: '/auth/login',
    loginCallbackPath: '/auth/callback',
    logoutPath: '/auth/logout',

    ...opts,
  };
  const cookies = getCookies(req);

  infoLog({ req, cookies, config });

  // shouldRedirectToLogin if
  // - Path is login start
  // - Not logged in and not public route

  // If path is logout path
  // Redirect to logout URL

  // If shouldRedirectToLogin
  // Redirect

  return undefined;
}
