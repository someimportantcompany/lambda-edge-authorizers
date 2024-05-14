import * as cdk from 'aws-cdk-lib';

export function createLambdaRole(stack: cdk.Stack, opts: {
  resourceName: string,
}): cdk.aws_iam.Role {
  return new cdk.aws_iam.Role(stack, 'role', {
    roleName: opts.resourceName,
    assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com') as cdk.aws_iam.IPrincipal,
    managedPolicies: [
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    ],
  });
}
