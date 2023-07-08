# S3 bucket for website.
resource "aws_s3_bucket" "s3_bucket" {
  bucket = var.bucket_name
  policy = data.aws_iam_policy_document.allow_public_s3_read.json

  tags = var.common_tags
}

# S3 bucket website configuration 
resource "aws_s3_bucket_website_configuration" "s3_bucket_website" {
  bucket = aws_s3_bucket.s3_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_acl" "s3_bucket_acl" {
  bucket = aws_s3_bucket.s3_bucket.id
  acl    = "public-read"
}

# S3 bucket CORS configuration
resource "aws_s3_bucket_cors_configuration" "s3_bucket_cors" {
  bucket = aws_s3_bucket.s3_bucket.id
  cors_rule {
    allowed_headers = ["Authorization", "Content-Length"]
    allowed_methods = ["GET", "POST"]
    allowed_origins = ["https://www.${var.domain_name}", "https://${var.domain_name}"]
    max_age_seconds = 3000
  }
}

# IAM policy for public read of s3 bucket
data "aws_iam_policy_document" "allow_public_s3_read" {
  statement {
    sid    = "PublicReadGetObject"
    effect = "Allow"

    actions = [
      "s3:GetObject",
    ]

    resources = [
      "arn:aws:s3:::${var.bucket_name}/*"
    ]
  }
}
