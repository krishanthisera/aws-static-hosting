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