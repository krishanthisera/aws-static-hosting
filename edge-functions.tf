module "edge_functions" {
  count  = local.edge_enabled ? 1 : 0
  source = "./modules/edge-functions"

  providers = {
    aws = aws.us_east_1
  }

  # Only consumed for Lambda@Edge functions; "" when the distribution runs
  # CloudFront Functions only (they carry their code inline).
  artifacts_bucket                 = try(aws_s3_bucket.edge_artifacts[0].bucket, "")
  function_versions                = var.function_versions
  lambda_associations              = var.lambda_associations
  cloudfront_function_associations = var.cloudfront_function_associations
  name_prefix                      = "${replace(var.domain_name, ".", "-")}-"

  # aws_cloudfront_function needs the code inline; pass the committed built bundle.
  cloudfront_function_code = {
    uri-rewrite = file("${path.module}/lib/cloudfront-functions/packages/uri-rewrite/build/index.js")
  }
}
