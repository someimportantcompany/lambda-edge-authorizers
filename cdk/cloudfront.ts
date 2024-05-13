import * as cdk from 'aws-cdk-lib';

/**
 * @link https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront-readme.html
 */
export function createCloudfrontDistribution(stack: cdk.Stack, opts: {
  resourceName: string,
  lambdaAuthorizer: cdk.aws_lambda.Function,
  lambdaPrivateSite: cdk.aws_lambda.Function,
  lambdaPrivateUrl: cdk.aws_lambda.FunctionUrl,
  authorizerIncludeBody?: boolean | undefined,
}) {
  const origin = new cdk.aws_cloudfront_origins.FunctionUrlOrigin(opts.lambdaPrivateUrl, {
    originId: 'lambda-private-site',
  });

  const cloudfront = new cdk.aws_cloudfront.Distribution(stack, 'Distribution', {
    comment: opts.resourceName,
    // ...(opts.cloudfrontCustomDomain && {
    //   domainNames: [ opts.cloudfrontCustomDomain ],
    // }),
    // ...(opts.cloudfrontCertificateId && {
    //   certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(stack, 'Certificate', cdk.Fn.join('', [
    //     'arn:aws:acm:us-east-1:', cdk.Fn.ref('AWS::AccountId'), ':certificate/', opts.cloudfrontCertificateId,
    //   ])),
    // }),
    defaultBehavior: {
      origin,
      allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
      viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cdk.aws_cloudfront.CachePolicy.CACHING_DISABLED,
      originRequestPolicy: cdk.aws_cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      edgeLambdas: [
        {
          functionVersion: opts.lambdaAuthorizer.currentVersion as any,
          eventType: cdk.aws_cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
          includeBody: opts.authorizerIncludeBody ?? false,
        },
      ],
    },
  });

  /**
   * @NOTE Lambda OAC disabled for now as it doesn't appear to support POST/PUT requests 🤦‍♂️
   */
  // const oac = new cdk.aws_cloudfront.CfnOriginAccessControl(stack, 'PrivateSiteFunctionUrlOAC', {
  //   originAccessControlConfig: {
  //     name: "PrivateSiteFunction",
  //     originAccessControlOriginType: "lambda",
  //     signingBehavior: "always",
  //     signingProtocol: "sigv4",
  //   },
  // });
  // Override the OAC ID into the CloudFormation distribution CFN construct
  // (cloudfront.node.defaultChild as cdk.aws_cloudfront.CfnDistribution).addPropertyOverride(
  //   'DistributionConfig.Origins.0.OriginAccessControlId',
  //   oac.getAtt('Id'),
  // );
  // opts.lambdaPrivateSite.grantInvokeUrl(new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com', {
  //   conditions: {
  //     ArnLike: {
  //       'aws:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(stack).account}:distribution/${cloudfront.distributionId}`,
  //     },
  //   },
  // }));

  return {
    cloudfront,
  };
}
