import { tryCatch } from '@someimportantcompany/utils';
import type { CloudFrontRequest, CloudFrontResultResponse } from 'aws-lambda';

import { readCookieValue, writeCookieValue } from './lib/cookies';
import { createResponse } from './cloudfront.helpers';
import { concatUrl, getCookies, createRedirectResponse, getSelfBaseUrl } from './lib/req';
import { renderErrorPage, renderLogoutPage } from './lib/template';
import { jsonStringify, formatErr } from './lib/utils';
import type { CookieOpts } from './types';

export interface StandaloneAuthCookie {
  username: string,
  password: string,
}

export interface StandaloneProfile extends Record<string, unknown> {}

export interface StandaloneAuthorizerOpts<
  Profile extends StandaloneProfile,
> {
  logins: Record<string, { profile?: Profile, password: string }>,
  customise?: {
    title?: string,
    logoUrl?: string,
  },
  passwords?: {
    compare?: (input: string, password: string) => boolean,
  },

  baseUrl?: string,
  callbackEndpoint?: string,
  loginEndpoint?: string,
  logoutEndpoint?: string,
  cookie?: CookieOpts,
}

export function creatStandaloneProvider<
  Profile extends StandaloneProfile,
>(opts: StandaloneAuthorizerOpts<Profile>) {
  return async function standaloneProvider(req: CloudFrontRequest): Promise<{
    response?: CloudFrontResultResponse | undefined,
    username?: string | undefined,
    profile?: Profile | undefined,
  }> {
    const config: Required<StandaloneAuthorizerOpts<Profile>> = {
      baseUrl: getSelfBaseUrl(req),
      callbackEndpoint: '/',
      loginEndpoint: '/auth/login',
      logoutEndpoint: '/auth/logout',

      ...opts,

      customise: {
        ...opts.customise,
      },

      passwords: {
        compare: (a, b) => a === b,
        ...opts.passwords,
      },

      cookie: {
        name: 'auth',
        path: '/',
        httpOnly: true,
        secure: true,
        ...opts.cookie,
      },
    };

    const cookies = getCookies(req);

    let auth = typeof cookies[config.cookie.name!] === 'string' && cookies[config.cookie.name!].length
      ? tryCatch(
        () => readCookieValue<StandaloneAuthCookie>(cookies[config.cookie.name!]!, config.cookie.secret),
        () => undefined,
      )
      : undefined;

    let { profile } = ((auth?.username && opts.logins[auth.username]) ? opts.logins[auth.username] : undefined) ?? {};

    const isLoggedIn = Boolean(auth?.username && opts.logins[auth.username]);

    // console.log(jsonStringify({
    //   config, req, cookies, isLoggedIn,
    // }));
    // console.debug(jsonStringify({
    //   auth, profile,
    // }));

    if (req.method === 'GET' && req.uri === config.loginEndpoint) {
      // Render the login page
    } else if (req.method === 'POST' && req.uri === config.loginEndpoint) {
      // Process the login request
      try {
        auth = { username: 'foo', password: 'bar' };

        const response = createRedirectResponse(concatUrl(config.baseUrl, config.callbackEndpoint), {
          cookies: {
            [config.cookie.name!]: {
              // By default, set the cookie to expire when this access token should
              expires: '1d',
              // But this could be overwritten by the developer
              ...config.cookie,
              // And embed the OauthCookie into the cookie
              value: writeCookieValue(auth, config.cookie.secret),
            },
          },
        });

        return { response, username: auth?.username, profile };
      } catch (err: any) {
        console.error(jsonStringify({
          err: formatErr(err as Error),
        }));

        const response = createResponse({
          status: '500',
          headers: {
            'content-type': [ { key: 'Content-Type', value: 'text/html' } ],
          },
          cookies: {
            [config.cookie.name!]: {
              ...config.cookie,
              value: null,
            },
          },
          body: renderErrorPage({
            message: err.err_description ?? 'Something went wrong trying to sign-in',
            code: err.err_code ?? undefined,
          }),
        });

        return { response };
      }
    } else if (req.method === 'GET' && req.uri === config.logoutEndpoint) {
      const response = createResponse({
        status: '200',
        headers: {
          'content-type': [ { key: 'Content-Type', value: 'text/html' } ],
        },
        cookies: {
          [config.cookie.name!]: {
            ...config.cookie,
            value: null,
          },
        },
        body: renderLogoutPage(),
      });

      return { response };
    }

    if (!isLoggedIn) {
      const response = createRedirectResponse(concatUrl(config.baseUrl, config.loginEndpoint));
      return { response };
    }

    return { response: undefined, username: auth?.username, profile };
  };
}
