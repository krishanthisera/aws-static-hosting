module "edge_functions" {
  source = "github.com/krishanthisera/aws-edge-functions"

  providers = {
    aws = aws.us_east_1
  }
}