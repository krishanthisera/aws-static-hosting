# Retrieve AWS account ID 
data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
}

# IAM policy for public read of s3 bucket
data "aws_iam_policy_document" "allow_public_s3_read" {
  statement {
    sid    = "PublicReadGetObject"
    effect = "Allow"

    actions = [
      "s3:GetObject",
    ]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"

      values = [
        "${aws_cloudfront_distribution.blog_distribution.arn}"
      ]
    }

    resources = [
      "arn:aws:s3:::${var.bucket_name}",
      "arn:aws:s3:::${var.bucket_name}/*"
    ]
  }
}