locals {
  # Lambda@Edge bundles are pulled by Lambda from this S3 bucket, and the CI
  # publisher user exists only to upload them. CloudFront Functions carry their
  # code inline, so they need neither. => bucket + publisher gate on
  # lambda_associations alone.
  lambda_edge_enabled = length(var.lambda_associations) > 0

  # The edge-functions module builds either kind of function, so it gates on
  # "any association at all".
  edge_enabled = length(var.lambda_associations) > 0 || length(var.cloudfront_function_associations) > 0

  edge_artifacts_bucket_name = coalesce(var.edge_artifacts_bucket_name, "${var.bucket_name}-edge-artifacts")
}

# S3 bucket that mirrors the built Lambda@Edge function bundles published by CI.
# Lambda@Edge requires the code bucket to live in us-east-1.
resource "aws_s3_bucket" "edge_artifacts" {
  count    = local.lambda_edge_enabled ? 1 : 0
  provider = aws.us_east_1
  bucket   = local.edge_artifacts_bucket_name

  tags = var.common_tags
}

resource "aws_s3_bucket_versioning" "edge_artifacts" {
  count    = local.lambda_edge_enabled ? 1 : 0
  provider = aws.us_east_1
  bucket   = aws_s3_bucket.edge_artifacts[0].id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "edge_artifacts" {
  count                   = local.lambda_edge_enabled ? 1 : 0
  provider                = aws.us_east_1
  bucket                  = aws_s3_bucket.edge_artifacts[0].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
