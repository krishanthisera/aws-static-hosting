# IAM Policy for put S3 objects
resource "aws_iam_policy" "allow_s3_put_policy" {
  name        = "allow_aws_s3_put"
  description = "Allow Pipeline Deployment to put objects in S3"
  policy      = data.aws_iam_policy_document.allow_aws_s3_put.json
}

# IAM policy for cloudfront to invalidate cache
resource "aws_iam_policy" "allow_cloudfront_invalidations_policy" {
  name        = "allow_cloudfront_invalidate"
  description = "Allow pipeline user to create CloudFront invalidation"
  policy      = data.aws_iam_policy_document.allow_cloudfront_invalidate.json
}

# IAM User group for Pipeline Deployment
resource "aws_iam_group" "pipeline_deployment_group" {
  name = "${var.domain_name}_deployment_group"
}

# IAM Policy attachment for Pipeline Deployment - S3 PUT
resource "aws_iam_group_policy_attachment" "se_put_group_policy_attachment" {
  group      = aws_iam_group.pipeline_deployment_group.name
  policy_arn = aws_iam_policy.allow_s3_put_policy.arn
}

# IAM Policy attachment for Pipeline Deployment - CloudFront Invalidation
resource "aws_iam_group_policy_attachment" "cloudfront_invalidation_group_policy_attachment_2" {
  group      = aws_iam_group.pipeline_deployment_group.name
  policy_arn = aws_iam_policy.allow_cloudfront_invalidations_policy.arn
}

# IAM User for Pipeline Deployment
resource "aws_iam_user" "pipeline_deployment_user" {
  name = "${var.domain_name}_deployer"
}

# IAM User group membership for Pipeline Deployment
resource "aws_iam_group_membership" "deployment_group_membership" {
  name = "pipeline_deployment_group_membership"
  users = [
    aws_iam_user.pipeline_deployment_user.name
  ]
  group = aws_iam_group.pipeline_deployment_group.name
}