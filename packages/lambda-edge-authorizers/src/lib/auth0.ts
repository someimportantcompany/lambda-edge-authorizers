import axios from 'axios';
import qs from 'qs';
import type { CloudFrontRequest, CloudFrontResultResponse } from 'aws-lambda';

import { assert, getCookies, createRedirectResponse, getSelfBaseUrl, infoLog, errorLog } from '../utils';
import type { CookieOpts } from '../types';

const auth0 = axios.create({
  headers: { 'user-agent': process.env.AWS_LAMBDA_FUNCTION_NAME },
  responseType: 'json',
});

auth0.interceptors.response.use(res => {
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

export interface Auth0AuthorizerOpts {
  clientId: string,
  clientSecret: string,
  domain: string,

  baseUrl?: string,
  callbackPath?: string,
  cookie?: CookieOpts,
  loginStartPath?: string,
  loginCallbackPath?: string,
  logoutPath?: string,
}

export async function handleAuth0Authorizer(req: CloudFrontRequest, opts: Auth0AuthorizerOpts):
Promise<CloudFrontResultResponse | undefined> {
  const config: Required<Auth0AuthorizerOpts> = {
    baseUrl: getSelfBaseUrl(req),
    cookie: { name: 'auth' },
    callbackPath: '/',
    loginStartPath: '/auth/login',
    loginCallbackPath: '/auth/callback',
    logoutPath: '/auth/logout',

    ...opts,
  };

  const cookies = getCookies(req);

  infoLog({ req, cookies, config });

  // const token = typeof cookies[config.cookie.name] === 'string' && cookies[config.cookie.name].length ? cookies[config.cookie.name] : undefined;

  // Validate auth token

  if (req.uri === config.loginStartPath) {
    return createRedirectResponse(`https://${config.domain}/authorize`, {
      query: {
        client_id: config.clientId,
        response_type: 'code',
        redirect_uri: `${config.baseUrl}${config.loginCallbackPath}`,
        // state={state}
      },
    });
  }

  if (req.uri === config.loginCallbackPath) {
    try {
      const { code } = qs.parse(req.querystring);
      assert(code, 'Missing code from query', { code: 'req_missing_code', status: 400 });

      await auth0.post<{ id_token: string }>(`https://${config.domain}/oauth/token`, qs.stringify({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: 'ff',
        redirect_uri: `${config.baseUrl}${config.loginCallbackPath}`,
      }), {
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        validateStatus: status => status === 200,
      });
    } catch (err) {
      errorLog({ err });
    }
  }

  // if (req.uri === config.loginCallbackPath) {
  //   return createRedirectResponse(config.callbackPath, {
  //     client_id: config.clientId,
  //     response_type: 'code',
  //     redirect_uri: `${config.baseUrl}${config.loginCallbackPath}`,
  //     // state={state}
  //   });
  // }

  if (req.uri === config.logoutPath) {
    return createRedirectResponse(config.loginStartPath, {
      cookies: {
        [config.cookie.name]: {
          value: null,
          ...config.cookie,
        }
      }
    });
  }

  return undefined;
}
