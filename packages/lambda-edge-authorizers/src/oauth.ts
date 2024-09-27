import axios from 'axios';
import ms from 'ms';
import qs from 'qs';
import { assert, tryCatch } from '@someimportantcompany/utils';
import type { JwtPayload, VerifyOptions } from 'jsonwebtoken';
import type { CloudFrontRequest, CloudFrontResultResponse } from 'aws-lambda';

import { readCookieValue, writeCookieValue } from './lib/cookies';
import { createJwksClient, verifyTokenWithJwks, decodeToken, verifyTokenWithSecret } from './lib/jwts';
import { createResponse } from './cloudfront.helpers';
import { concatUrl, getCookies, createRedirectResponse, getSelfBaseUrl } from './lib/req';
import { renderErrorPage, renderLogoutPage } from './lib/template';
import { jsonStringify, formatErr } from './lib/utils';
import type { CookieOpts } from './types';

export interface OauthCookie {
  token_type: string;
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

export interface OauthIdTokenPayload extends JwtPayload {}

export interface OauthAuthorizerOpts {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthAuthorize: {
    url: string;
    query?: Record<string, string | number | boolean | undefined> | undefined;
  };
  oauthTokenExchange: {
    url: string;
    headers?: Record<string, string | number | boolean | undefined> | undefined;
  };
  oauthIdToken?:
    | {
        required?: true;
        jwksUrl?: string | undefined;
        jwksHeaders?: Record<string, string | number | boolean | undefined> | undefined;
        jwtSecret?: string | undefined;
        jwtVerifyOpts?: VerifyOptions | undefined;
      }
    | undefined;

  oauthLogoutEndpoint?:
    | {
        endpoint: string;
        query?: Record<string, string | number | boolean | undefined> | undefined;
      }
    | undefined;

  baseUrl?: string;
  callbackEndpoint?: string;
  loginStartEndpoint?: string;
  loginCallbackEndpoint?: string;
  logoutEndpoint?: string;
  cookie?: CookieOpts;
}

export function createOauthProvider<IdTokenPayload extends OauthIdTokenPayload>(opts: OauthAuthorizerOpts) {
  const oauth = axios.create();

  oauth.interceptors.response.use(
    (res) => {
      // const { config, status, headers, data } = res;
      // const { method, url, headers: reqHeaders, params, data: reqData } = config;
      // console.log(jsonStringify({
      //   request: { method, url, headers: reqHeaders, params, data: reqData },
      //   response: { status, headers, data },
      // }));
      return res.data;
    },
    (err) => {
      if (typeof err?.response?.data?.error_description === 'string') {
        const { status, headers, data } = err.response;
        // const { method, url, headers: reqHeaders, params, data: reqData } = err.config;
        // console.error(jsonStringify({
        //   request: { method, url, headers: reqHeaders, params, data: reqData },
        //   response: { status, headers, data },
        //   err: formatErr(err),
        // }));
        assert(false, 'An error occurred', {
          err_code: err?.response?.data?.error_code ?? err?.response?.data?.error ?? undefined,
          err_description: err?.response?.data?.error_description,
          res: { status, headers, data },
        });
      } else {
        // const { method, url, headers: reqHeaders, params, data: reqData } = err.config;
        // console.error(jsonStringify({
        //   req: { method, url, headers: reqHeaders, params, data: reqData },
        //   err: formatErr(err),
        // }));
      }

      throw err;
    },
  );

  const jwksClient = opts.oauthIdToken?.jwksUrl
    ? createJwksClient({
        jwksUri: opts.oauthIdToken.jwksUrl,
        requestHeaders: {
          ...(process.env.AWS_LAMBDA_FUNCTION_NAME
            ? { 'user-agent': process.env.AWS_LAMBDA_FUNCTION_NAME }
            : undefined),
          ...opts.oauthIdToken?.jwksHeaders,
        },
        timeout: ms('10s'),
      })
    : undefined;

  return async function oauthProvider(req: CloudFrontRequest): Promise<{
    response?: CloudFrontResultResponse | undefined;
    token?: OauthCookie | undefined;
    idTokenPayload?: IdTokenPayload | undefined;
  }> {
    const config: Required<OauthAuthorizerOpts> = {
      baseUrl: getSelfBaseUrl(req),
      callbackEndpoint: '/',
      loginStartEndpoint: '/auth/login',
      loginCallbackEndpoint: '/auth/callback',
      logoutEndpoint: '/auth/logout',

      oauthIdToken: undefined,
      oauthLogoutEndpoint: undefined,

      ...opts,

      cookie: {
        name: 'auth',
        path: '/',
        httpOnly: true,
        secure: true,
        ...opts.cookie,
      },
    };

    const cookies = getCookies(req);

    let token =
      typeof cookies[config.cookie.name!] === 'string' && cookies[config.cookie.name!].length
        ? tryCatch(
            () => readCookieValue<OauthCookie>(cookies[config.cookie.name!]!, config.cookie.secret),
            () => undefined,
          )
        : undefined;

    // Validate ID token if present
    let idTokenPayload: IdTokenPayload | undefined = undefined;
    if (token?.id_token) {
      if (jwksClient) {
        try {
          idTokenPayload = await verifyTokenWithJwks<IdTokenPayload>(
            jwksClient,
            token.id_token,
            config.oauthIdToken?.jwtVerifyOpts,
          );
        } catch (err) {
          console.error(
            jsonStringify({
              err: formatErr(err as Error),
            }),
          );
        }
      } else if (config.oauthIdToken?.jwtSecret) {
        idTokenPayload = verifyTokenWithSecret<IdTokenPayload>(
          config.oauthIdToken.jwtSecret,
          token.id_token,
          config.oauthIdToken?.jwtVerifyOpts,
        );
      } else {
        idTokenPayload = decodeToken<IdTokenPayload>(token.id_token, config.oauthIdToken?.jwtVerifyOpts);
      }
    }

    const isLoggedIn = token?.id_token ? Boolean(idTokenPayload !== undefined) : Boolean(token);

    // console.log(jsonStringify({
    //   config, req, cookies, isLoggedIn,
    // }));

    // console.debug(jsonStringify({
    //   token, idTokenPayload,
    // }));

    if (req.uri === config.loginStartEndpoint) {
      try {
        const { url } = config.oauthAuthorize;
        assert(url, 'Missing url from oauthAuthorize', { code: 'config_error', status: 500 });

        const response = createRedirectResponse(url, {
          query: {
            client_id: config.oauthClientId,
            response_type: 'code',
            redirect_uri: concatUrl(config.baseUrl, config.loginCallbackEndpoint),
            ...config.oauthAuthorize?.query,
            // state={state}
          },
        });

        return { response };
      } catch (err: any) {
        console.error(
          jsonStringify({
            err: formatErr(err as Error),
          }),
        );

        const response = createResponse({
          status: '500',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html' }],
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
    }

    if (req.uri === config.loginCallbackEndpoint) {
      try {
        const { url } = config.oauthTokenExchange;
        assert(url, 'Missing url from oauthTokenExchange', { code: 'config_error', status: 500 });

        const { code } = qs.parse(req.querystring);
        assert(code, 'Missing code from query', { code: 'req_missing_code', status: 400 });

        token = await oauth.request<{}, OauthCookie>({
          method: 'POST',
          url: url,
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
            ...(process.env.AWS_LAMBDA_FUNCTION_NAME
              ? { 'user-agent': process.env.AWS_LAMBDA_FUNCTION_NAME }
              : undefined),
            ...config.oauthTokenExchange?.headers,
          },
          data: qs.stringify({
            grant_type: 'authorization_code',
            client_id: config.oauthClientId,
            client_secret: config.oauthClientSecret,
            code,
            redirect_uri: concatUrl(config.baseUrl, config.loginCallbackEndpoint),
          }),
          responseType: 'json',
          validateStatus: (status) => status === 200,
        });

        assert(
          typeof token?.id_token === 'string' || config.oauthIdToken?.required !== true,
          'Missing id_token from token response',
        );

        if (token?.id_token) {
          if (jwksClient) {
            try {
              idTokenPayload = await verifyTokenWithJwks<IdTokenPayload>(
                jwksClient,
                token.id_token,
                config.oauthIdToken?.jwtVerifyOpts,
              );
            } catch (err) {
              console.error(
                jsonStringify({
                  err: formatErr(err as Error),
                }),
              );
            }
          } else if (config.oauthIdToken?.jwtSecret) {
            idTokenPayload = verifyTokenWithSecret<IdTokenPayload>(
              config.oauthIdToken.jwtSecret,
              token.id_token,
              config.oauthIdToken?.jwtVerifyOpts,
            );
          } else {
            idTokenPayload = decodeToken<IdTokenPayload>(token.id_token, config.oauthIdToken?.jwtVerifyOpts);
          }

          console.debug(
            jsonStringify({
              token,
              idTokenPayload,
            }),
          );
        }

        const response = createRedirectResponse(concatUrl(config.baseUrl, config.callbackEndpoint), {
          cookies: {
            [config.cookie.name!]: {
              // By default, set the cookie to expire when this access token should
              ...(typeof token.expires_in === 'number' ? { expires: `${token.expires_in}s` } : undefined),
              // But this could be overwritten by the developer
              ...config.cookie,
              // And embed the OauthCookie into the cookie
              value: writeCookieValue(token, config.cookie.secret),
            },
          },
        });

        return { response, token, idTokenPayload };
      } catch (err: any) {
        console.error(
          jsonStringify({
            err: formatErr(err as Error),
          }),
        );

        const response = createResponse({
          status: '500',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html' }],
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
    }

    if (req.uri === config.logoutEndpoint) {
      if (config.oauthLogoutEndpoint?.endpoint) {
        const response = createRedirectResponse(config.oauthLogoutEndpoint.endpoint, {
          cookies: {
            [config.cookie.name!]: {
              ...config.cookie,
              value: null,
            },
          },
          query: config.oauthAuthorize?.query,
        });

        return { response };
      } else {
        const response = createResponse({
          status: '200',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html' }],
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
    }

    if (!isLoggedIn) {
      const response = createRedirectResponse(concatUrl(config.baseUrl, config.loginStartEndpoint));
      return { response };
    }

    return { response: undefined, token, idTokenPayload };
  };
}
