# Lambda@Edge functions. Code is pulled by Lambda directly from the artifacts
# bucket using a version-pinned key, so Terraform never reads or downloads the
# bundle and only redeploys when var.function_versions[<fn>] changes.
resource "aws_lambda_function" "lambda_at_edge" {
  for_each = local.lambda_names

  function_name = "${var.name_prefix}${each.value}"
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  publish       = true
  memory_size   = 128
  role          = aws_iam_role.lambda_edge_exec.arn

  s3_bucket = var.artifacts_bucket
  s3_key    = "lambda-at-edge/${each.value}/${var.function_versions[each.value]}.zip"
}

# CloudFront Functions. aws_cloudfront_function has no S3/URL code source, so the
# code is the committed built bundle passed in by the caller. It changes only when
# that file changes (a pre-commit hook rebuilds it from source).
resource "aws_cloudfront_function" "cloudfront_function_associations" {
  for_each = local.cloudfront_function_names

  name    = "${var.name_prefix}${each.value}"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = var.cloudfront_function_code[each.value]
}

resource "aws_iam_role" "lambda_edge_exec" {
  assume_role_policy = data.aws_iam_policy_document.lambda_edge_assume_role_policy.json
}

resource "aws_iam_role_policy_attachment" "lambda_edge_logs" {
  role       = aws_iam_role.lambda_edge_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
