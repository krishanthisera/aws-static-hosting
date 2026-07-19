module "edge-functions" {
  source = "github.com/krishantha/aws-edge-functions"

  providers = {
    aws = aws.us_east_1
  }
}