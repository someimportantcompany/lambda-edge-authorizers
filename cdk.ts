import path from 'path';
import * as cdk from 'aws-cdk-lib';

import { createStack } from './cdk/stack';

const cdkStackPrefix = process.env.CDK_STACK_PREFIX ?? 'lambda-edge-authorizers';
const customDomain =
  process.env.CUSTOM_DOMAIN && process.env.CUSTOM_DOMAIN_CERT_ID
    ? {
        hostname: process.env.CUSTOM_DOMAIN,
        certificateId: process.env.CUSTOM_DOMAIN_CERT_ID,
      }
    : undefined;

const app = new cdk.App();

if (process.env.AUTH0_CLIENT_ID && process.env.AUTH0_CLIENT_SECRET) {
  createStack(app, 'Auth0', {
    stackName: `${cdkStackPrefix}-auth0`,
    authorizerEntryPath: path.resolve(__dirname, './packages/lambda-example-auth0/1-out-of-the-box.ts'),
    envExamplePath: path.resolve(__dirname, './packages/lambda-example-auth0/.env.example'),
    customDomain: customDomain ? { ...customDomain, hostname: `auth0.${customDomain.hostname}` } : undefined,
  });
}

createStack(app, 'Standalone', {
  stackName: `${cdkStackPrefix}-standalone`,
  authorizerEntryPath: path.resolve(__dirname, './packages/lambda-example-standalone/1-out-of-the-box.ts'),
  authorizerIncludeBody: true,
  customDomain,
});
