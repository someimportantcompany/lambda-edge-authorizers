import path from 'path';
import * as cdk from 'aws-cdk-lib';

import { createStack } from './cdk/stack';

const app = new cdk.App();
const prefix = process.env.CDK_STACK_PREFIX ?? 'lambda-edge-authorizer';

createStack(app, 'Auth0', {
  stackName: `${prefix}-auth0`,
  authorizerEntryPath: path.resolve(__dirname, './packages/lambda-example-auth0/index.ts'),
  envExamplePath: path.resolve(__dirname, './packages/lambda-example-auth0/.env.example'),
});
