output "lambda_qualified_arns" {
  description = "Map of function name => qualified (versioned) ARN, for lambda_function_association."
  value       = { for k, f in aws_lambda_function.lambda_at_edge : k => f.qualified_arn }
}

output "cloudfront_function_arns" {
  description = "Map of function name => ARN, for function_association."
  value       = { for k, f in aws_cloudfront_function.cloudfront_function_associations : k => f.arn }
}
