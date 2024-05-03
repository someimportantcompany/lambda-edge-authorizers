import * as cdk from 'aws-cdk-lib';

import { createCloudfrontDistribution } from './cloudfront';
import { createLambdaAuthorizer } from './lambda-authorizer';
import { createLambdaPrivateSite } from './lambda-private-site';
import { createLambdaRole } from './lambda-role';

export function createStack(app: cdk.App, id: string, opts: {
  stackName: string,
  authorizerEntryPath: string,
  authorizerHandlerFn?: string,
  envExamplePath?: string | undefined,
}): void {
  const stack = new cdk.Stack(app, id, {
    stackName: opts.stackName,
  });

  const resourceName = cdk.Fn.join('-', [
    cdk.Fn.ref('AWS::StackName'),
    cdk.Fn.select(0, cdk.Fn.split('-', cdk.Fn.select(1, cdk.Fn.split('/', cdk.Fn.select(1, cdk.Fn.split('stack/', cdk.Fn.ref('AWS::StackId'))))))),
  ]);

  const lambdaRole = createLambdaRole(stack, {
    resourceName,
  });

  const { lambdaAuthorizer } = createLambdaAuthorizer(stack, {
    resourceName,
    role: lambdaRole,
    entry: opts.authorizerEntryPath,
    handler: opts.authorizerHandlerFn,
    envExamplePath: opts.envExamplePath,
  });

  const { lambdaPrivateSite, lambdaPrivateUrl } = createLambdaPrivateSite(stack, {
    resourceName,
    role: lambdaRole,
  });

  const { cloudfront } = createCloudfrontDistribution(stack, {
    resourceName,
    lambdaAuthorizer,
    lambdaPrivateSite,
    lambdaPrivateUrl,
  });

  (o => Object.fromEntries(Object.entries(o).map(([ key, value ]) => ([
    key, new cdk.CfnOutput(stack, key, { value }),
  ]))))({
    LambdaRoleArn: lambdaRole.roleArn,
    LambdaAuthorizerArn: lambdaAuthorizer.functionArn,
    LambdaPrivateSiteArn: lambdaPrivateSite.functionArn,
    CloudfrontDomain: cloudfront.distributionDomainName,
    Url: cdk.Fn.join('', ['https://', cloudfront.distributionDomainName]),
  });
}
