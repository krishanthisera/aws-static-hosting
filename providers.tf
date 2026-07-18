terraform {
  required_version = "~> 1.15"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.55"
    }
  }

  backend "remote" {
    hostname     = "app.terraform.io"
    organization = "bizkt"
    workspaces {
      name = "blog-infra"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
