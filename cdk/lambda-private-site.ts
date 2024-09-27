import path from 'path';
import * as cdk from 'aws-cdk-lib';

export function createLambdaPrivateSite(
  stack: cdk.Stack,
  opts: {
    resourceName: string;
    role: cdk.aws_iam.Role;
  },
) {
  const lambdaPrivateSite = new cdk.aws_lambda_nodejs.NodejsFunction(stack, 'PrivateSiteFunction', {
    functionName: cdk.Fn.join('-', [opts.resourceName, 'site']),
    runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
    entry: path.resolve(__dirname, '../packages/lambda-private-site/index.ts'),
    handler: 'handler',
    role: opts.role as cdk.aws_iam.IRole,
    bundling: {
      minify: false,
      sourceMap: false,
      format: cdk.aws_lambda_nodejs.OutputFormat.CJS,
      target: 'node18',
    },
  });

  const lambdaPrivateUrl = lambdaPrivateSite.addFunctionUrl({
    authType: cdk.aws_lambda.FunctionUrlAuthType.NONE,
  });

  return {
    lambdaPrivateSite,
    lambdaPrivateUrl,
  };
}
