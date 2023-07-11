# S3 bucket for website.
resource "aws_s3_bucket" "blog_assets" {
  bucket = var.bucket_name

  tags = var.common_tags
}

# S3 Bucket Policy Association
resource "aws_s3_bucket_policy" "assets_bucket_cloudfront_policy_association" {
  bucket = aws_s3_bucket.blog_assets.id
  policy = data.aws_iam_policy_document.s3_bucket_policy.json
}

# S3 bucket website configuration 
resource "aws_s3_bucket_website_configuration" "assets_bucket_website" {
  bucket = aws_s3_bucket.blog_assets.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

resource "aws_s3_bucket_acl" "assets_bucket_acl" {
  bucket     = aws_s3_bucket.blog_assets.id
  acl        = "public-read"
  depends_on = [aws_s3_bucket_ownership_controls.assets_bucket_acl_ownership]
}

# S3 bucket CORS configuration
resource "aws_s3_bucket_cors_configuration" "assets_bucket_cors" {
  bucket = aws_s3_bucket.blog_assets.id
  cors_rule {
    allowed_headers = ["Authorization", "Content-Length"]
    allowed_methods = ["GET", "POST"]
    allowed_origins = ["https://www.${var.domain_name}", "https://${var.domain_name}"]
    max_age_seconds = 3000
  }
}


resource "aws_s3_bucket_ownership_controls" "assets_bucket_acl_ownership" {
  bucket = aws_s3_bucket.blog_assets.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
  depends_on = [aws_s3_bucket_public_access_block.assets_bucket_public_access]
}


resource "aws_s3_bucket_public_access_block" "assets_bucket_public_access" {
  bucket                  = aws_s3_bucket.blog_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
