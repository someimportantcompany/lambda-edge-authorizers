import * as cdk from 'aws-cdk-lib';

import { createCloudfrontDistribution } from './cloudfront';
import { createLambdaAuthorizer } from './lambda-authorizer';
import { createLambdaPrivateSite } from './lambda-private-site';
import { createLambdaRole } from './lambda-role';

export function createStack(
  app: cdk.App,
  id: string,
  opts: {
    stackName: string;
    authorizerEntryPath: string;
    authorizerHandlerFn?: string;
    authorizerIncludeBody?: boolean | undefined;
    envExamplePath?: string | undefined;
    // cloudfrontCustomDomain?: string | undefined,
    // cloudfrontCertificateId?: string | undefined,
  },
): void {
  const stack = new cdk.Stack(app, id, {
    stackName: opts.stackName,
  });

  // const resourceName = cdk.Fn.join('-', [
  //   cdk.Fn.ref('AWS::StackName'),
  //   cdk.Fn.select(0, cdk.Fn.split('-', cdk.Fn.select(1, cdk.Fn.split('/', cdk.Fn.select(1, cdk.Fn.split('stack/', cdk.Fn.ref('AWS::StackId'))))))),
  // ]);

  const lambdaRole = createLambdaRole(stack, {
    resourceName: opts.stackName,
  });

  const { lambdaAuthorizer } = createLambdaAuthorizer(stack, {
    resourceName: opts.stackName,
    role: lambdaRole,
    entry: opts.authorizerEntryPath,
    handler: opts.authorizerHandlerFn,
    envExamplePath: opts.envExamplePath,
  });

  const { lambdaPrivateSite, lambdaPrivateUrl } = createLambdaPrivateSite(stack, {
    resourceName: opts.stackName,
    role: lambdaRole,
  });

  const { cloudfront } = createCloudfrontDistribution(stack, {
    resourceName: opts.stackName,
    lambdaAuthorizer,
    lambdaPrivateSite,
    lambdaPrivateUrl,
    authorizerIncludeBody: opts.authorizerIncludeBody,
    // cloudfrontCustomDomain: opts.cloudfrontCustomDomain,
    // cloudfrontCertificateId: opts.cloudfrontCertificateId,
  });

  ((o) =>
    Object.fromEntries(Object.entries(o).map(([key, value]) => [key, new cdk.CfnOutput(stack, key, { key, value })])))({
    LambdaRoleArn: lambdaRole.roleArn,
    LambdaAuthorizerArn: lambdaAuthorizer.functionArn,
    LambdaPrivateSiteArn: lambdaPrivateSite.functionArn,
    LambdaPrivateUrl: lambdaPrivateUrl.url,
    CloudfrontDomain: cloudfront.distributionDomainName,
    Url: cdk.Fn.join('', ['https://', cloudfront.distributionDomainName]),
  });
}
