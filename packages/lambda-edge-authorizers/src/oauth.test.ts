import assert from 'assert';
import nock from 'nock';
import * as cookie from 'cookie';
import { randomBytes } from 'crypto';
import { test, describe, beforeAll, afterAll } from '@jest/globals';

import { createRequest } from '@lambda-edge-authorizers/test/aws-lambda-edge/requests';
import { concatUrl } from '@lambda-edge-authorizers/test/urls';

import * as oauth from './oauth';

test('should export a collection of functions', () => {
  assert(typeof oauth === 'object', 'Expected {* as oauth} to be an object');
  assert(typeof oauth.createOauthProvider === 'function', 'Expected createOauthProvider to be a function');
});

describe('#createOauthProvider.oauthProvider', () => {
  const config = {
    oauthClientId: 'oauth-test-client-id',
    oauthClientSecret: 'oauth-test-client-secret',
    oauthProviderUrl: 'http://test-oauth-provider.local',
    oauthAuthorizeEndpoint: '/authorize',
    oauthTokenExchangeEndpoint: '/oauth/token',
  };

  const opts: oauth.OauthAuthorizerOpts = {
    oauthClientId: config.oauthClientId,
    oauthClientSecret: config.oauthClientSecret,
    oauthAuthorize: {
      url: concatUrl([config.oauthProviderUrl, config.oauthAuthorizeEndpoint]),
    },
    oauthTokenExchange: {
      url: concatUrl([config.oauthProviderUrl, config.oauthTokenExchangeEndpoint]),
    },
    oauthIdToken: undefined,
    oauthLogoutEndpoint: undefined,

    baseUrl: 'https://d0000000.cloudfront.dev.local',
    callbackEndpoint: '/test-start',
    loginStartEndpoint: '/test-login',
    loginCallbackEndpoint: '/test-login-callback',
    logoutEndpoint: '/test-logout',
    cookie: {
      name: 'auth',
      path: '/',
      httpOnly: true,
      secure: true,
    },
  };

  let authorizer: ReturnType<typeof oauth.createOauthProvider>;
  beforeAll(() => {
    authorizer = oauth.createOauthProvider(opts);
  });
  afterAll(() => {
    nock.cleanAll();
  });

  test('should redirect to the login route when unauthenticated', async () => {
    const request = createRequest();
    const { response } = await authorizer(request);

    const actualLocation = concatUrl([opts.baseUrl!, opts.loginStartEndpoint!]);

    assert.deepStrictEqual(response, {
      status: '302',
      statusDescription: 'Found',
      headers: {
        location: [
          { key: 'Location', value: `${actualLocation}` },
        ],
      },
      body: `Redirecting to: ${actualLocation}`,
      bodyEncoding: 'text'
    });
  });

  test('should redirect to the oauth provider upon request', async () => {
    const request = createRequest({
      path: opts.loginStartEndpoint!,
    });
    const { response } = await authorizer(request);

    const actualLocation = concatUrl([opts.oauthAuthorize.url!], {
      client_id: opts.oauthClientId,
      response_type: 'code',
      redirect_uri: concatUrl([opts.baseUrl!, opts.loginCallbackEndpoint!]),
    });

    assert.deepStrictEqual(response, {
      status: '302',
      statusDescription: 'Found',
      headers: {
        location: [
          { key: 'Location', value: actualLocation },
        ],
      },
      body: `Redirecting to: ${actualLocation}`,
      bodyEncoding: 'text'
    });
  });

  test('should handle a successful response from the oauth provider', async () => {
    const code = 'A1B2C3D4E5';
    const oauthResponse = {
      token_type: 'Bearer',
      access_token: randomBytes(16).toString('hex'),
      expires_in: 86400,
    };

    const cookieValue = Buffer.from(JSON.stringify(oauthResponse), 'utf8').toString('base64');

    const scope = nock(config.oauthProviderUrl)
      .post(config.oauthTokenExchangeEndpoint, {
        grant_type: 'authorization_code',
        client_id: config.oauthClientId,
        client_secret: config.oauthClientSecret,
        code,
        redirect_uri: concatUrl([opts.baseUrl!, opts.loginCallbackEndpoint!]),
      })
      .reply(200, oauthResponse);

    const request = createRequest({
      path: opts.loginCallbackEndpoint!,
      query: { code },
    });
    const { response } = await authorizer(request);

    const actualLocation = concatUrl([opts.baseUrl!, opts.callbackEndpoint!]);
    const setCookieValue = cookie.serialize(opts.cookie!.name!, cookieValue, {
      ...opts.cookie,
      expires: new Date(Date.now() + (oauthResponse.expires_in * 1000)),
      maxAge: oauthResponse.expires_in,
    });

    assert.deepStrictEqual(response, {
      status: '302',
      statusDescription: 'Found',
      headers: {
        location: [
          { key: 'Location', value: actualLocation },
        ],
        'set-cookie': [
          { key: 'Set-Cookie', value: setCookieValue },
        ],
      },
      body: `Redirecting to: ${actualLocation}`,
      bodyEncoding: 'text'
    });

    scope.done();
  });

  test('should handle an error response from the oauth provider', async () => {
    const code = 'A1B2C3D4E5';

    const scope = nock(config.oauthProviderUrl)
      .post(config.oauthTokenExchangeEndpoint, {
        grant_type: 'authorization_code',
        client_id: config.oauthClientId,
        client_secret: config.oauthClientSecret,
        code,
        redirect_uri: concatUrl([opts.baseUrl!, opts.loginCallbackEndpoint!]),
      })
      .reply(400, {
        error: 'invalid_request',
        error_description: 'Something went really wrong',
      });

    const request = createRequest({
      path: opts.loginCallbackEndpoint!,
      query: { code },
    });
    let { response } = await authorizer(request);

    const { body } = response ?? {};
    response = response ? { ...response, body: '[HTML-CONTENT]' } : undefined;

    assert.deepStrictEqual(response, {
      status: '500',
      statusDescription: 'Internal Server Error',
      headers: {
        'content-type': [
          { key: 'Content-Type', value: 'text/html' }
        ],
        'set-cookie': [
          { key: 'Set-Cookie', value: 'auth=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure' },
        ],
      },
      body: '[HTML-CONTENT]',
      bodyEncoding: 'text'
    });

    // console.log(body);
    assert(body?.includes('An error occurred'), 'Expected the HTML page to return the title');
    assert(body?.includes('Something went really wrong'), 'Expected the HTML page to include the error description');
    assert(body?.includes('Error: invalid_request'), 'Expected the HTML page to include the error code');

    scope.done();
  });

  test('should let authenticated requests pass through', async () => {
    const oauthResponse = {
      token_type: 'Bearer',
      access_token: randomBytes(16).toString('hex'),
      expires_in: 86400,
    };

    const cookieValue = Buffer.from(JSON.stringify(oauthResponse), 'utf8').toString('base64');

    const request = createRequest({
      path: opts.callbackEndpoint!,
      headers: {
        'Cookie': `${opts.cookie!.name!}=${cookieValue}`,
      },
    });
    const { response } = await authorizer(request);

    assert.deepStrictEqual(response, undefined);
  });

  test('should logout the authenticated user upon request', async () => {
    const oauthResponse = {
      token_type: 'Bearer',
      access_token: randomBytes(16).toString('hex'),
      expires_in: 86400,
    };

    const cookieValue = Buffer.from(JSON.stringify(oauthResponse), 'utf8').toString('base64');

    const request = createRequest({
      path: opts.logoutEndpoint!,
      headers: {
        'Cookie': `${opts.cookie!.name!}=${cookieValue}`,
      },
    });
    let { response } = await authorizer(request);

    const { body } = response ?? {};
    response = response ? { ...response, body: '[HTML-CONTENT]' } : undefined;

    assert.deepStrictEqual(response, {
      status: '200',
      statusDescription: 'OK',
      headers: {
        'content-type': [
          { key: 'Content-Type', value: 'text/html' }
        ],
        'set-cookie': [
          { key: 'Set-Cookie', value: 'auth=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure' },
        ]
      },
      body: '[HTML-CONTENT]',
      bodyEncoding: 'text'
    });

    // console.log(body);
    assert(body?.includes('Logout successful'), 'Expected the HTML page to return the first line');
    assert(body?.includes('You may now close this tab'), 'Expected the HTML page to include the second line');
    assert(body?.includes('Thank you!'), 'Expected the HTML page to include the third line');
  });

  describe('.oauthIdToken', () => {

    // test('should handle a successful response from the oauth provider, including the ID token');

    // test('should let authenticated requests pass through, validating the ID token');

  });

  describe('.oauthLogoutEndpoint', () => {

    // test('should redirect to the oauth provider upon logout');

  });
});
