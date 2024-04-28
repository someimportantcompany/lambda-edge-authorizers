import axios from 'axios';
import ms from 'ms';
import qs from 'qs';
import { assert, tryCatch } from '@someimportantcompany/utils';

import { readCookieValue, writeCookieValue } from './lib/cookies';
import { createJwksClient, verifyTokenWithJwks } from './lib/jwts';
import { concatUrl, getCookies, createRedirectResponse, getSelfBaseUrl } from './lib/req';
import { infoLog, errorLog } from './lib/utils';
import type { CookieOpts, AuthorizerFn } from './types';

export interface OauthAuthorizerOpts {
  oauthClientId: string,
  oauthClientSecret: string,
  oauthAuthorize: {
    endpoint: string,
    query?: Record<string, string | number | boolean | undefined>,
  },
  oauthTokenExchange: {
    endpoint: string,
    userAgent?: string,
  },
  oauthIdToken?: undefined | {
    jwksEndpoint: string,
    headers?: Record<string, string | number | boolean | undefined>,
    userAgent?: string,
  },

  baseUrl?: string,
  callbackEndpoint?: string,
  loginStartEndpoint?: string,
  loginCallbackEndpoint?: string,
  logoutEndpoint?: string,
  cookie?: CookieOpts,
}

interface OauthResponse {
  token_type: string,
  access_token: string,
  id_token?: string,
  expires_in?: number,
  scope?: string,
}

export function createOauthProvider(opts: OauthAuthorizerOpts): AuthorizerFn {
  const oauth = axios.create();

  oauth.interceptors.response.use(res => {
    const { config, status, headers, data } = res;
    const { method, url, headers: reqHeaders, params, data: reqData } = config;
    infoLog({
      request: { method, url, headers: reqHeaders, params, data: reqData },
      response: { status, headers, data },
    });
    return res.data;
  }, err => {
    const { method, url, headers: reqHeaders, params, data: reqData } = err.config;

    if (typeof err?.response?.data?.message === 'string') {
      const { status, headers, data } = err.response;
      errorLog({
        request: { method, url, headers: reqHeaders, params, data: reqData },
        response: { status, headers, data },
        err,
      });
      assert(false, err?.response?.data?.error_description, {
        code: err?.response?.data?.error_code ?? undefined,
        res: { status, headers, data },
      });
    } else {
      errorLog({
        req: { method, url, headers: reqHeaders, params, data: reqData },
        err,
      });
    }

    throw err;
  });

  const jwksClient = opts.oauthIdToken?.jwksEndpoint
    ? createJwksClient({
      jwksUri: opts.oauthIdToken.jwksEndpoint,
      requestHeaders: {
        'user-agent': opts.oauthIdToken.userAgent
            ?? process.env.AWS_LAMBDA_FUNCTION_NAME
            ?? 'lambda-edge-authorizers',
        ...opts.oauthIdToken?.headers,
      },
      timeout: ms('10s'),
    })
    : undefined;

  return async function oauthProvider(req) {
    const config: Required<OauthAuthorizerOpts> = {
      baseUrl: getSelfBaseUrl(req),
      callbackEndpoint: '/',
      loginStartEndpoint: '/auth/login',
      loginCallbackEndpoint: '/auth/callback',
      logoutEndpoint: '/auth/logout',

      oauthIdToken: undefined,

      ...opts,

      cookie: {
        name: 'auth',
        path: '/',
        ...opts.cookie,
      },
    };

    const cookies = getCookies(req);

    const token = typeof cookies[config.cookie.name!] === 'string' && cookies[config.cookie.name!].length
      ? tryCatch(() => readCookieValue<OauthResponse>(cookies[config.cookie.name!]!, config.cookie.secret), () => undefined)
      : undefined;

    // Validate auth token
    const details = (jwksClient && token?.id_token) ?
      await verifyTokenWithJwks(jwksClient, token.id_token, { algorithms: ['HS256', 'RS256'] })
        .catch(err => errorLog({ err }))
      : undefined;

    const isLoggedIn = (jwksClient && token?.id_token) ? Boolean(details) : Boolean(token);

    infoLog({ config, req, cookies, token, details, isLoggedIn });

    if (req.uri === config.loginStartEndpoint) {
      return createRedirectResponse(config.oauthAuthorize.endpoint, {
        query: {
          client_id: config.oauthClientId,
          response_type: 'code',
          redirect_uri: concatUrl(config.baseUrl, config.loginCallbackEndpoint),
          ...config.oauthAuthorize?.query,
          // state={state}
        },
      });
    }

    if (req.uri === config.loginCallbackEndpoint) {
      try {
        const { endpoint } = config.oauthTokenExchange;
        assert(endpoint, 'Missing endpoint from oauthTokenExchange', { code: 'config_error', status: 500 });

        const { code } = qs.parse(req.querystring);
        assert(code, 'Missing code from query', { code: 'req_missing_code', status: 400 });

        const newToken = await oauth.request<{}, OauthResponse>({
          method: 'POST',
          url: endpoint,
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
            'user-agent': config.oauthTokenExchange?.userAgent
              ?? process.env.AWS_LAMBDA_FUNCTION_NAME
              ?? 'lambda-edge-authorizers',
          },
          data: qs.stringify({
            grant_type: 'authorization_code',
            client_id: config.oauthClientId,
            client_secret: config.oauthClientSecret,
            code,
            redirect_uri: concatUrl(config.baseUrl, config.loginCallbackEndpoint),
          }),
          responseType: 'json',
          validateStatus: status => status === 200,
        });

        if (jwksClient && newToken?.id_token) {
          const details = await verifyTokenWithJwks(jwksClient, newToken.id_token, { algorithms: ['HS256', 'RS256'] })
            .catch(err => errorLog({ err }));
          infoLog({ token, details });
        }

        return createRedirectResponse(concatUrl(config.baseUrl, config.callbackEndpoint), {
          cookies: {
            [config.cookie.name!]: {
              ...config.cookie,
              value: writeCookieValue(newToken, config.cookie.secret),
            },
          },
        });
      } catch (err) {
        errorLog({ err });
      }
    }

    if (req.uri === config.logoutEndpoint) {
      return createRedirectResponse(concatUrl(config.baseUrl, config.callbackEndpoint), {
        cookies: {
          [config.cookie.name!]: {
            ...config.cookie,
            value: null,
          }
        }
      });
    }

    if (!isLoggedIn) {
      return createRedirectResponse(concatUrl(config.baseUrl, config.loginStartEndpoint));
    }

    return undefined;
  };
}
