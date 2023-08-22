variable "domain_name" {
  type        = string
  description = "The domain name for the website."
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
    event_type = string
    lambda_arn = string
  }))
  default = [
    {
      event_type = "viewer-request"
      lambda_arn = "module.edge-functions.function_arns[\"filter-function\"]"
    },
    {
      event_type = "origin-request"
      lambda_arn = "module.edge-functions.function_arns[\"prerender-proxy\"]"
    },
    {
      event_type = "origin-response"
      lambda_arn = "module.edge-functions.function_arns[\"response-handler\"]"
    }
  ]
}
