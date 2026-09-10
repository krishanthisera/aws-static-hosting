variable "domain_name" {
  type        = string
  description = "The domain name for the website."
}

variable "additional_domain_aliases" {
  type        = list(string)
  description = "Additional domain aliases for the website."
  default     = []
}

variable "bucket_name" {
  type        = string
  description = "The name of the bucket without the www. prefix. Normally domain_name."
}

variable "common_tags" {
  description = "Common tags you want applied to all components."
}

variable "ssl_certificate_arn" {
  type        = string
  description = "SSL certificate ARN for the CloudFront distribution."
  default     = ""
}

variable "aws_region" {
  type        = string
  description = "AWS region to deploy to. This where the S3 bucket will be created."
  default     = "ap-southeast-2"
}

variable "lambda_associations" {
  description = "Lambda function associations"
  type = list(object({
    event_type  = string
    lambda_name = string
  }))
  default = [
    {
      event_type  = "viewer-request"
      lambda_name = "filter-function"
    },
    {
      event_type  = "origin-request"
      lambda_name = "prerender-proxy"
    },
    {
      event_type  = "origin-response"
      lambda_name = "response-handler"
    }
  ]
}

variable "cloudfront_function_associations" {
  description = "CloudFront Function associations. CloudFront Functions only support viewer-request / viewer-response."
  type = list(object({
    event_type  = string
    lambda_name = string
  }))
  default = [
    {
      event_type  = "viewer-request"
      lambda_name = "uri-rewrite"
    }
  ]
}

variable "create_validation_records" {
  description = "Whether to create Route 53 validation records for the SSL certificate."
  type        = bool
  default     = false
}

variable "edge_artifacts_bucket_name" {
  description = "Name of the S3 bucket (us-east-1) that mirrors the built Lambda@Edge function bundles published by CI."
  type        = string
  default     = ""
}

variable "function_versions" {
  description = "Pinned published version per edge function. Terraform only redeploys a function when its version here changes."
  type        = map(string)
  default = {
    filter-function  = "1.0.0"
    prerender-proxy  = "1.0.0"
    geo-redirect     = "1.0.0"
    response-handler = "1.0.0"
    uri-rewrite      = "1.0.0"
  }
}

variable "custom_error_responses" {
  description = "CloudFront custom error responses (e.g. map S3 403/404 to a static 404 page)."
  type = list(object({
    error_code            = number
    response_code         = optional(number)
    response_page_path    = optional(string)
    error_caching_min_ttl = optional(number)
  }))
  default = [
    {
      error_code            = 403
      response_code         = 404
      response_page_path    = "/404.html"
      error_caching_min_ttl = 10
    },
    {
      error_code            = 404
      response_code         = 404
      response_page_path    = "/404.html"
      error_caching_min_ttl = 10
    }
  ]
}