locals {
  # Distinct function names referenced by each association list. The module builds
  # only what is referenced, not every entry in var.function_versions.
  lambda_names              = toset([for a in var.lambda_associations : a.lambda_name])
  cloudfront_function_names = toset([for a in var.cloudfront_function_associations : a.lambda_name])
}
