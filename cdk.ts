import path from 'path';
import * as cdk from 'aws-cdk-lib';

import { createStack } from './cdk/stack';

const CDK_STACK_PREFIX = process.env.CDK_STACK_PREFIX ?? 'lambda-edge-authorizer';

const app = new cdk.App();

createStack(app, 'Auth0', {
  stackName: `${CDK_STACK_PREFIX}-auth0`,
  authorizerEntryPath: path.resolve(__dirname, './packages/lambda-example-auth0/index.ts'),
  envExamplePath: path.resolve(__dirname, './packages/lambda-example-auth0/.env.example'),
});
