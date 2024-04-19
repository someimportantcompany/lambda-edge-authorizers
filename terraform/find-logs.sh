#!/bin/bash

cd "$(dirname "$0")"

FUNCTION_NAME=$(terraform output -raw lambda_function)
echo $FUNCTION_NAME

for region in $(aws --output text ec2 describe-regions | cut -f 4); do
  echo "Checking $region"
  for loggroup in $(aws --output text logs describe-log-groups --log-group-name-prefix "/aws/lambda/us-east-1.$FUNCTION_NAME" --region $region --query 'logGroups[].logGroupName'); do
      echo "FOUND: $region $loggroup"
  done
done
