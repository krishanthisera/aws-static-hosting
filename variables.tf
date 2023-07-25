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
  default = {
    "ManagedBy" = "Terraform"
  }
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

variable "index_document" {
  type = string
  description = "(optional) Index document to be associated with S3 and CloudFront."
  default = "index.html"
}

variable "error_document" {
  type = string
  description = "(optional) error document to be associated with S3 and CloudFront."
  default = "404.html"
}

variable "provission_acm" {
  type = string
  description = "(optional) Provision an ACM certificate for the domain name."
  default = "false"
}

variable "acm_validatio_method" {
  type = string
  description = "(optional) ACM validation method."
  default = "EMAIL"
}
