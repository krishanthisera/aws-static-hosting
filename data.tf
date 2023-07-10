# Retrieve AWS account ID 
data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
}

# IAM policy for CloudFront Read Access
data "aws_iam_policy_document" "cf_s3_read_policy" {
  statement {
    sid    = "CloudFront"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:ListBucket"
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


# IAM policy Deployer User
data "aws_iam_policy_document" "deployer_s3_read_policy" {
  statement {
    sid    = "DeployerUser"
    effect = "Allow"

    actions = [
      "s3:ListBucket"
    ]

    principals {
      type        = "AWS"
      identifiers = [aws_iam_user.pipeline_deployment_user.arn]
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


# IAM policy for cloudfront to invalidate cache
data "aws_iam_policy_document" "allow_cloudfront_invalidate" {
  statement {
    sid    = "AllowCloudFrontInvalidation"
    effect = "Allow"

    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "cloudfront:ListInvalidations"
    ]

    resources = [
      "${aws_cloudfront_distribution.blog_distribution.arn}"
    ]
  }
}

# IAM Policy for put S3 objects
data "aws_iam_policy_document" "allow_aws_s3_put" {
  statement {
    sid    = "AllowS3Put"
    effect = "Allow"

    actions = [
      "s3:GetObject*",
      "s3:GetBucket*",
      "s3:List*",
      "s3:DeleteObject*",
      "s3:PutObject",
      "s3:PutObjectLegalHold",
      "s3:PutObjectRetention",
      "s3:PutObjectTagging",
      "s3:PutObjectVersionTagging",
      "s3:Abort*"
    ]

    resources = [
      "arn:aws:s3:::${var.bucket_name}/*"
    ]
  }
}