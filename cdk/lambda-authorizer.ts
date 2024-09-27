import dotenv from 'dotenv';
import fs from 'fs';
import * as cdk from 'aws-cdk-lib';

function createDefineEnvs(envExamplePath?: string | undefined): Record<string, string> {
  if (envExamplePath && fs.existsSync(envExamplePath)) {
    const envKeys = Object.keys(dotenv.parse(fs.readFileSync(envExamplePath, 'utf8')));
    return Object.fromEntries(
      envKeys
        .filter((key) => typeof process.env[key] === 'string')
        .map((key) => [`process.env.${key}`, `"${process.env[key]!}"`]),
    );
  } else {
    return {};
  }
}

export function createLambdaAuthorizer(
  stack: cdk.Stack,
  opts: {
    resourceName: string;
    role: cdk.aws_iam.Role;
    entry: string;
    handler?: string | undefined;
    envExamplePath?: string | undefined;
  },
) {
  const lambdaAuthorizer = new cdk.aws_lambda_nodejs.NodejsFunction(stack, 'AuthorizerFunction', {
    functionName: cdk.Fn.join('-', [opts.resourceName, 'authorizer']),
    runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
    entry: opts.entry,
    handler: opts.handler ?? 'handler',
    role: opts.role as cdk.aws_iam.IRole,
    bundling: {
      minify: false,
      sourceMap: false,
      format: cdk.aws_lambda_nodejs.OutputFormat.CJS,
      target: 'node18',
      define: createDefineEnvs(opts.envExamplePath),
    },
    currentVersionOptions: {
      description: 'LIVE',
    },
  });

  // Lambda@Edge functions cannot be deleted like regular Lambda functions
  // All replicas will be removed an hour or so after the distribution has been deleted
  // So.. retain these functions & we'll implement a manual cleanup for CI/CD later
  lambdaAuthorizer.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

  return {
    lambdaAuthorizer,
  };
}
