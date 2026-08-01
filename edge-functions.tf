module "edge_functions" {
  count  = length(var.lambda_associations) > 0 ? 1 : 0
  source = "./modules/lambda-at-edge"

  providers = {
    aws = aws.us_east_1
  }
}