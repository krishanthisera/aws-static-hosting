module "edge_functions" {
  count  = length(var.lambda_associations) > 0 ? 1 : 0
  source = "github.com/krishanthisera/aws-edge-functions"

  providers = {
    aws = aws.us_east_1
  }
}