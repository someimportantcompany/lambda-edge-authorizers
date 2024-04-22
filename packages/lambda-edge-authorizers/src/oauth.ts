import axios from 'axios';
import qs from 'qs';

import { assert, concatUrl, getCookies, createRedirectResponse, getSelfBaseUrl, infoLog, errorLog } from './utils';
import type { CookieOpts, AuthorizerFn } from './types';

export interface OauthAuthorizerOpts {
  oauthClientId: string,
  oauthClientSecret: string,
  oauthBaseUrl: string,
  oauthAuthorizeEndpoint?: string,
  oauthAuthorizeScopes?: string,
  oauthTokenEndpoint?: string,
  oauthUserAgent?: string,

  siteBaseUrl?: string,
  siteCallbackEndpoint?: string,
  siteLoginStartEndpoint?: string,
  siteLoginCallbackEndpoint?: string,
  siteLogoutEndpoint?: string,

  cookie?: CookieOpts,
}

export function createOauthProvider(opts: OauthAuthorizerOpts): AuthorizerFn {
  assert(opts.oauthBaseUrl.startsWith('http://') || opts.oauthBaseUrl.startsWith('https://'),
    'Expected oauthBaseUrl to start with http(s)://', { status: 500 });

  const oauth = axios.create();

  oauth.interceptors.response.use(res => {
    const { config, status, headers, data } = res;
    const { method, url, headers: reqHeaders, params, data: reqData } = config;
    infoLog({
      request: { method, url, headers: reqHeaders, params, data: reqData },
      response: { status, headers, data },
    });
    return res;
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

  return async function oauthProvider(req) {
    const config: Required<OauthAuthorizerOpts> = {
      oauthAuthorizeEndpoint: '/authorize',
      oauthAuthorizeScopes: 'email',
      oauthTokenEndpoint: '/oauth/token',
      oauthUserAgent: process.env.AWS_LAMBDA_FUNCTION_NAME ?? 'lambda-edge-authorizers',

      siteBaseUrl: getSelfBaseUrl(req),
      siteCallbackEndpoint: '/',
      siteLoginStartEndpoint: '/auth/login',
      siteLoginCallbackEndpoint: '/auth/callback',
      siteLogoutEndpoint: '/auth/logout',

      cookie: { name: 'auth' },

      ...opts,
    };

    const cookies = getCookies(req);

    infoLog({ req, cookies, config });

    // const token = typeof cookies[config.cookie.name] === 'string' && cookies[config.cookie.name].length ? cookies[config.cookie.name] : undefined;

    // Validate auth token

    if (req.uri === config.siteLoginStartEndpoint) {
      return createRedirectResponse(concatUrl(config.oauthBaseUrl, config.oauthAuthorizeEndpoint), {
        query: {
          client_id: config.oauthClientId,
          response_type: 'code',
          redirect_uri: concatUrl(config.siteBaseUrl, config.siteLoginCallbackEndpoint),
          scope: config.oauthAuthorizeScopes,
          // state={state}
        },
      });
    }

    if (req.uri === config.siteLoginCallbackEndpoint) {
      try {
        const { code } = qs.parse(req.querystring);
        assert(code, 'Missing code from query', { code: 'req_missing_code', status: 400 });

        await oauth.request<{ id_token: string }>({
          baseURL: opts.oauthBaseUrl,
          method: 'POST',
          url: concatUrl(config.oauthBaseUrl, config.oauthTokenEndpoint),
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
            'user-agent': process.env.AWS_LAMBDA_FUNCTION_NAME,
          },
          data: qs.stringify({
            grant_type: 'authorization_code',
            client_id: config.oauthClientId,
            client_secret: config.oauthClientSecret,
            code,
            redirect_uri: concatUrl(config.siteBaseUrl, config.siteLoginCallbackEndpoint),
          }),
          responseType: 'json',
          validateStatus: status => status === 200,
        });
      } catch (err) {
        errorLog({ err });
      }
    }

    if (req.uri === config.siteLogoutEndpoint) {
      return createRedirectResponse(config.siteCallbackEndpoint, {
        cookies: {
          [config.cookie.name]: {
            value: null,
            ...config.cookie,
          }
        }
      });
    }

    return undefined;
  };
}
