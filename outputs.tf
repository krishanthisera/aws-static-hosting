output "assets_bucket_domain_name" {
  value = aws_s3_bucket.blog_assets.bucket_regional_domain_name
}


output "cloudfront_arn" {
  value = aws_cloudfront_distribution.blog_distribution.arn
}

output "cloudfront_domain_name" {
    value = aws_cloudfront_distribution.blog_distribution.domain_name
}