import type { CloudFrontRequest, CloudFrontRequestResult } from 'aws-lambda';

import { getCookies, infoLog } from '../utils';

export interface Auth0AuthorizerOpts {
  callbackPath?: string,

  loginStartPath?: string,
  loginCallbackPath?: string,
  logoutPath?: string,
}

export const auth0DefaultOpts = {
  callbackPath: process.env.CALLBACK_PATH ?? '/',

  loginStartPath: process.env.AUTH0_LOGIN_START_PATH ?? '/auth/login',
  loginCallbackPath: process.env.AUTH0_LOGIN_CALLBACK_PATH ?? '/auth/callback',
  logoutPath: process.env.AUTH0_LOGOUT_PATH ?? '/auth/logout',
};

export function handleAuth0Authorizer(req: CloudFrontRequest, overrides?: Auth0AuthorizerOpts):
CloudFrontRequestResult | Promise<CloudFrontRequestResult> {
  const opts = { ...auth0DefaultOpts, ...overrides };
  const cookies = getCookies(req);

  infoLog({ req, cookies, opts });

  // shouldRedirectToLogin if
  // - Path is login start
  // - Not logged in and not public route

  // If path is logout path
  // Redirect to logout URL

  // If shouldRedirectToLogin
  // Redirect

  return req;
}
