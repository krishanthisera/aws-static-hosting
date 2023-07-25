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

  custom_error_response {
    error_caching_min_ttl = 0
    error_code            = 404
    response_code         = 200
    response_page_path    = "/404.html"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.bucket_name}"

    lambda_function_association {
      event_type   = "origin-request"
      lambda_arn   = module.edge-functions.function_arns["prerender"]
    }

    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = module.edge-functions.function_arns["prerender-check"]
    }

    forwarded_values {
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


# Edge Functions
resource "aws_cloudfront_function" "astro_default_edge_function" {
  name    = "default_edge_function"
  runtime = "cloudfront-js-1.0"
  comment = "CloudFront Functions for Astro"
  publish = true
  code    = file("src/astro.js")
}
