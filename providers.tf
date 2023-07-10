terraform {
  required_version = "~> 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.7"
    }
  }

  backend "remote" {}
}

provider "aws" {
  region = "${var.aws_region}"
}
