variable "artifacts_bucket" {
  type        = string
  description = "Name of the S3 bucket (us-east-1) holding the built Lambda@Edge bundles, keyed lambda-at-edge/<fn>/<version>.zip."
}

variable "function_versions" {
  type        = map(string)
  description = "Pinned published version per edge function. A function is only redeployed when its version here changes."
}

variable "lambda_associations" {
  type = list(object({
    event_type  = string
    lambda_name = string
  }))
  description = "Lambda@Edge associations; the module builds only the functions referenced here."
  default     = []
}

variable "cloudfront_function_associations" {
  type = list(object({
    event_type  = string
    lambda_name = string
  }))
  description = "CloudFront Function associations; the module builds only the functions referenced here."
  default     = []
}

variable "cloudfront_function_code" {
  type        = map(string)
  description = "Map of CloudFront Function name => JS source. aws_cloudfront_function has no S3/URL code source, so the caller passes the committed built bundle (e.g. file(...) on lib/cloudfront-functions/packages/<fn>/build/index.js)."
  default     = {}
}

variable "name_prefix" {
  type        = string
  description = "Prefix prepended to function names (Lambda@Edge names are account+region global)."
  default     = ""
}
