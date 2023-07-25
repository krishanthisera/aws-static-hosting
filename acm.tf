# # SSL Certificate
# resource "aws_acm_certificate" "ssl_certificate" {
#   count = var.provission_acm == true ? 1 : 0
#   provider                  = aws.acm_provider
#   domain_name               = var.domain_name
#   subject_alternative_names = ["*.${var.domain_name}"]
#   validation_method         = var.acm_validatio_method

#   tags = var.common_tags

#   lifecycle {
#     create_before_destroy = true
#   }
# }

# # SSL Certificate Validation - DNS
# resource "aws_acm_certificate_validation" "cert_validation" {
#   count = var.acm_validatio_method == "DNS" ? 1 : 0
#   provider        = aws.acm_provider
#   certificate_arn = aws_acm_certificate.ssl_certificate.arn
# }