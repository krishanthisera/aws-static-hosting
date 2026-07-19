# # SSL Certificate
resource "aws_acm_certificate" "ssl_certificate" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = distinct(concat(["*.${var.domain_name}"], var.additional_domain_aliases))
  validation_method         = "DNS"

  tags = var.common_tags

  lifecycle {
    create_before_destroy = true
  }
}

// TODO: This has to be tested
resource "aws_acm_certificate_validation" "cert_validation" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.ssl_certificate.arn

  validation_record_fqdns = var.create_validation_records ? [
    for record in aws_route53_record.domain_validation : record.fqdn
  ] : []
}

// TODO: This has to be tested
resource "aws_route53_record" "domain_validation" {
  for_each = var.create_validation_records ? {
    for dvo in aws_acm_certificate.ssl_certificate.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.domain[0].zone_id
}

