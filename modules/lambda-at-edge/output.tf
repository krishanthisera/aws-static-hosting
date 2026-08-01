output "function_arns" {
  value = {
    for function in aws_lambda_function.edge_functions :
    function.function_name => function.qualified_arn
  }
}
 