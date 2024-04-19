variable "prefix" {
  type    = string
  default = "lambda-edge-authorizer"
}

locals {
  functions = [ "auth0" ]
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "edge-authorizer-role" {
  name               = "${var.prefix}-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

data "archive_file" "archives" {
  for_each    = toset(local.functions)
  type        = "zip"
  source_file = "../dist/handlers/${each.key}.js"
  output_path = ".terraform/handlers/${each.key}.zip"
}

resource "aws_lambda_function" "authorizers" {
  for_each    = toset(local.functions)
  runtime       = "nodejs18.x"
  function_name = "${var.prefix}-${each.key}"
  role          = aws_iam_role.edge-authorizer-role.arn
  handler       = "index.handler"

  filename         = data.archive_file.archives[each.key].output_path
  source_code_hash = data.archive_file.archives[each.key].output_base64sha256
}

output "functions" {
  value = [
    for fn in aws_lambda_function.authorizers : fn.arn
  ]
}
