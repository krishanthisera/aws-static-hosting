# Cloudfront distribution for main s3 site.
resource "aws_cloudfront_distribution" "blog_distribution" {

  origin {
    domain_name              = aws_s3_bucket.blog_assets.bucket_regional_domain_name
    origin_id                = "S3-${var.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.blog_distribution_origin_access.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = ["www.${var.domain_name}", "${var.domain_name}"]

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.bucket_name}"

    dynamic "lambda_function_association" {
      for_each = var.lambda_associations
      content {
        event_type = lambda_function_association.value.event_type
        lambda_arn =  module.edge-functions.function_arns["${lambda_function_association.value.lambda_name}"]
      }
    }

    forwarded_values {
      headers      = ["X-Request-Prerender", "X-Prerender-Host"]
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 31536000
    default_ttl            = 31536000
    max_ttl                = 31536000
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.ssl_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.1_2016"
  }

  tags = var.common_tags
}

# Cloudfront distribution for assets s3 site.
resource "aws_cloudfront_origin_access_control" "blog_distribution_origin_access" {
  name                              = "blog_distribution_origin_access"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
