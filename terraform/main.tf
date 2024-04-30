variable "prefix" {
  type    = string
  default = "lambda-edge-authorizer"
}

variable "service" {
  type = string

  validation {
    condition     = contains(["auth0"], var.service)
    error_message = "Valid values for var.service: auth0"
  }
}

resource "random_id" "lambda" {
  byte_length = 4
  keepers = {
    service = var.service
  }
}

data "aws_iam_policy_document" "lambda" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com", "edgelambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "lambda" {
  name                = "${var.prefix}-role"
  assume_role_policy  = data.aws_iam_policy_document.lambda.json
  managed_policy_arns = ["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"]
}

data "archive_file" "this" {
  type        = "zip"
  source_file = "../packages/lambda-example-${random_id.lambda.keepers.service}/index-dist.js"
  output_path = ".terraform/handler.zip"
}

resource "aws_lambda_function" "this" {
  runtime          = "nodejs18.x"
  function_name    = "${var.prefix}-${random_id.lambda.keepers.service}-${random_id.lambda.hex}"
  role             = aws_iam_role.lambda.arn
  handler          = "index-dist.handler"
  filename         = data.archive_file.this.output_path
  source_code_hash = data.archive_file.this.output_base64sha256
  publish          = true
}

output "lambda_function" {
  value = aws_lambda_function.this.function_name
}
output "lambda_function_arn" {
  value = aws_lambda_function.this.arn
}
output "lambda_function_qualified_arn" {
  value = aws_lambda_function.this.qualified_arn
}
