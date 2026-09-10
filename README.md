# Terraform Static Website/Blog Infrastructure

Terraform module for hosting a static website on AWS. Designed around the [Astro](https://astro.build/) framework but works with any static site generator.

## Architecture

```
Browser → CloudFront (CDN + Lambda@Edge) → S3 (private bucket)
                  ↑
          ACM Certificate (us-east-1)
```

- Traffic is served exclusively through CloudFront — the S3 bucket is private and accessed via Origin Access Control (OAC).
- Lambda@Edge functions handle viewer filtering, prerender proxying, and response processing at the edge.
- HTTPS is enforced via an ACM certificate with a minimum TLS version of 1.2.

## AWS Components

| Component | Description |
|---|---|
| **S3 Bucket** | Private bucket storing static assets; accessible only via CloudFront OAC |
| **CloudFront Distribution** | CDN with IPv6, forced HTTPS, 1-year cache TTL, and Lambda@Edge associations |
| **ACM Certificate** | SSL/TLS certificate provisioned in `us-east-1` (required by CloudFront) |
| **Route 53 Records** | Optional DNS validation records for the ACM certificate (see [SSL Certificate Validation](#ssl-certificate-validation)) |
| **Lambda@Edge Module** | Local Terraform module (`modules/edge-functions/`) deploying edge functions for viewer filtering, prerender proxy, geo-redirect, and response handling. Function code is published to GitHub Packages (`@krishanthisera/*`) from `lib/lambda-at-edge/` and `lib/cloudfront-functions/` |
| **IAM User & Group** | Deployer user (`<domain>_deployer`) with scoped S3 PUT and CloudFront invalidation permissions for CI/CD |

## Prerequisites

- Terraform `~> 1.15`
- AWS credentials configured with sufficient permissions
- A registered domain name

## Usage

Reference this module from your root Terraform configuration:

```hcl
module "static-hosting" {
  source = "github.com/krishanthisera/aws-static-hosting?ref=master"

  domain_name  = "example.com"
  bucket_name  = "example.com"
  aws_region   = "ap-southeast-2"
  common_tags  = { Project = "my-site" }
}
```

Then initialise and apply from your root configuration:

```sh
terraform init
terraform apply
```

## Edge Functions

By default the CloudFront distribution runs one CloudFront Function and three
Lambda@Edge functions:

| Event Type | Compute | Function | Purpose |
|---|---|---|---|
| `viewer-request` | CloudFront Function | `uri-rewrite` | Rewrites directory URIs to `index.html` |
| `viewer-request` | Lambda@Edge | `filter-function` | Flags bot/crawler requests for prerendering |
| `origin-request` | Lambda@Edge | `prerender-proxy` | Swaps the origin to a prerender service for flagged traffic |
| `origin-response` | Lambda@Edge | `response-handler` | Applies cache-control headers to origin responses |

These are managed by the local module `modules/edge-functions/`. It **builds
nothing**: TypeScript source lives in `lib/lambda-at-edge/` and
`lib/cloudfront-functions/` and is published to GitHub Packages by CI. Terraform
consumes a **pinned version** of each function, so `terraform plan` only shows a
change when you bump a version — never a perpetual `source_code_hash` diff, and
nothing is downloaded during `plan`/`apply`.

- **Lambda@Edge**: `aws_lambda_function` deploys straight from
  `s3://<edge_artifacts_bucket>/lambda-at-edge/<fn>/<version>.zip`. CI uploads the
  zip on release; bump `function_versions["<fn>"]` to roll forward.
- **CloudFront Functions**: `aws_cloudfront_function.code` must be inline, so the
  built `uri-rewrite` bundle is committed at
  `lib/cloudfront-functions/packages/uri-rewrite/build/index.js` and read with
  `file()`. A pre-commit hook (`make build-uri-rewrite-committed`) keeps it
  rebuilt from source.

Per-deployment config reaches the Lambda@Edge functions through CloudFront origin
custom headers (`x-edge-cfg-*`) — see `lib/lambda-at-edge/README.md`. Wiring those
`custom_header` blocks is a separate follow-up and is not managed yet.

### First-time setup

The artifacts bucket must exist and hold the `1.0.0` bundles before the functions
can deploy:

```sh
terraform apply -target=aws_s3_bucket.edge_artifacts -target=aws_iam_user.edge_publisher_user
make mirror-seed EDGE_ARTIFACTS_BUCKET=$(terraform output -raw edge_artifacts_bucket)
terraform apply
```

Then generate an access key for the `<domain>_edge_publisher` user and set the
repo secrets `EDGE_PUBLISHER_AWS_ACCESS_KEY_ID` /
`EDGE_PUBLISHER_AWS_SECRET_ACCESS_KEY` and the repo variable
`EDGE_ARTIFACTS_BUCKET` so CI can upload future releases.

### Additional Functions

The module also includes a `geo-redirect` function (not enabled by default) that redirects users based on their geographic location.

### Customizing Lambda Associations

To disable all Lambda@Edge associations, set `lambda_associations` to an empty list:

```hcl
module "static-hosting" {
  source = "github.com/krishanthisera/aws-static-hosting?ref=master"

  # ...
  lambda_associations = []
}
```

To use a custom set of functions, provide your own list:

```hcl
lambda_associations = [
  {
    event_type  = "viewer-request"
    lambda_name = "my-custom-function"
  },
  {
    event_type  = "origin-request"
    lambda_name = "geo-redirect"  # Enable geo-redirect
  }
]
```

## SSL Certificate Validation

The ACM certificate is provisioned by Terraform. DNS validation behaviour is controlled by `create_validation_records`:

| `create_validation_records` | Behaviour |
|---|---|
| `false` (default) | Certificate is created but Route 53 validation records are **not** managed. Add the CNAME records manually in your DNS provider. |
| `true` | Route 53 validation records are created automatically. The hosted zone is looked up by `domain_name`. Terraform waits for the certificate to reach `ISSUED` before proceeding. |

Enable automatic validation:

```hcl
create_validation_records = true
```

## CI/CD Deployer User

Terraform creates an IAM user named `<domain_name>_deployer` with two scoped policies:

- **S3 PUT** — upload build artifacts to the assets bucket
- **CloudFront invalidation** — purge the CDN cache after deployment

After `terraform apply`, generate an access key pair for this user and add the credentials to your CI/CD pipeline secrets.

## Outputs

| Output | Description |
|---|---|
| `assets_bucket_domain_name` | Regional domain name of the S3 assets bucket |
| `cloudfront_arn` | ARN of the CloudFront distribution |
| `cloudfront_domain_name` | CloudFront domain name (e.g. `d1234.cloudfront.net`) |

## Further Reading

- [Astro Framework](https://astro.build/)
- [Terraform by HashiCorp](https://www.terraform.io/)
- [AWS CloudFront](https://aws.amazon.com/cloudfront/)
- [AWS S3](https://aws.amazon.com/s3/)
- [Terraform Modules](https://developer.hashicorp.com/terraform/language/modules)

---

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
| ---- | ------- |
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | ~> 1.15 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 6.55 |

## Providers

| Name | Version |
| ---- | ------- |
| <a name="provider_aws"></a> [aws](#provider\_aws) | 6.55.0 |
| <a name="provider_aws.us_east_1"></a> [aws.us\_east\_1](#provider\_aws.us\_east\_1) | 6.55.0 |

## Resources

| Name | Type |
| ---- | ---- |
| [aws_acm_certificate.ssl_certificate](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate) | resource |
| [aws_acm_certificate_validation.cert_validation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation) | resource |
| [aws_cloudfront_distribution.blog_distribution](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution) | resource |
| [aws_cloudfront_origin_access_control.blog_distribution_origin_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control) | resource |
| [aws_iam_group.pipeline_deployment_group](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group) | resource |
| [aws_iam_group_membership.deployment_group_membership](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_membership) | resource |
| [aws_iam_group_policy_attachment.cloudfront_invalidation_group_policy_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_policy_attachment) | resource |
| [aws_iam_group_policy_attachment.s3_put_group_policy_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_group_policy_attachment) | resource |
| [aws_iam_policy.allow_cloudfront_invalidations_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.allow_edge_artifacts_put_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_policy.allow_s3_put_policy](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy) | resource |
| [aws_iam_user.edge_publisher_user](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user) | resource |
| [aws_iam_user.pipeline_deployment_user](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user) | resource |
| [aws_iam_user_policy_attachment.edge_publisher_put_attachment](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_policy_attachment) | resource |
| [aws_route53_record.domain_validation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record) | resource |
| [aws_s3_bucket.blog_assets](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket) | resource |
| [aws_s3_bucket.edge_artifacts](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket) | resource |
| [aws_s3_bucket_acl.assets_bucket_acl](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_acl) | resource |
| [aws_s3_bucket_cors_configuration.assets_bucket_cors](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_cors_configuration) | resource |
| [aws_s3_bucket_ownership_controls.assets_bucket_acl_ownership](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_ownership_controls) | resource |
| [aws_s3_bucket_policy.assets_bucket_cloudfront_policy_association](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_policy) | resource |
| [aws_s3_bucket_public_access_block.assets_bucket_public_access](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block) | resource |
| [aws_s3_bucket_public_access_block.edge_artifacts](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_public_access_block) | resource |
| [aws_s3_bucket_versioning.edge_artifacts](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning) | resource |

## Inputs

| Name | Description | Type | Default | Required |
| ---- | ----------- | ---- | ------- | :------: |
| <a name="input_additional_domain_aliases"></a> [additional\_domain\_aliases](#input\_additional\_domain\_aliases) | Additional domain aliases for the website. | `list(string)` | `[]` | no |
| <a name="input_aws_region"></a> [aws\_region](#input\_aws\_region) | AWS region to deploy to. This where the S3 bucket will be created. | `string` | `"ap-southeast-2"` | no |
| <a name="input_bucket_name"></a> [bucket\_name](#input\_bucket\_name) | The name of the bucket without the www. prefix. Normally domain\_name. | `string` | n/a | yes |
| <a name="input_cloudfront_function_associations"></a> [cloudfront\_function\_associations](#input\_cloudfront\_function\_associations) | CloudFront Function associations. CloudFront Functions only support viewer-request / viewer-response. | <pre>list(object({<br/>    event_type  = string<br/>    lambda_name = string<br/>  }))</pre> | <pre>[<br/>  {<br/>    "event_type": "viewer-request",<br/>    "lambda_name": "uri-rewrite"<br/>  }<br/>]</pre> | no |
| <a name="input_common_tags"></a> [common\_tags](#input\_common\_tags) | Common tags you want applied to all components. | `any` | n/a | yes |
| <a name="input_create_validation_records"></a> [create\_validation\_records](#input\_create\_validation\_records) | Whether to create Route 53 validation records for the SSL certificate. | `bool` | `false` | no |
| <a name="input_custom_error_responses"></a> [custom\_error\_responses](#input\_custom\_error\_responses) | CloudFront custom error responses (e.g. map S3 403/404 to a static 404 page). | <pre>list(object({<br/>    error_code            = number<br/>    response_code         = optional(number)<br/>    response_page_path    = optional(string)<br/>    error_caching_min_ttl = optional(number)<br/>  }))</pre> | <pre>[<br/>  {<br/>    "error_caching_min_ttl": 10,<br/>    "error_code": 403,<br/>    "response_code": 404,<br/>    "response_page_path": "/404.html"<br/>  },<br/>  {<br/>    "error_caching_min_ttl": 10,<br/>    "error_code": 404,<br/>    "response_code": 404,<br/>    "response_page_path": "/404.html"<br/>  }<br/>]</pre> | no |
| <a name="input_domain_name"></a> [domain\_name](#input\_domain\_name) | The domain name for the website. | `string` | n/a | yes |
| <a name="input_edge_artifacts_bucket_name"></a> [edge\_artifacts\_bucket\_name](#input\_edge\_artifacts\_bucket\_name) | Name of the S3 bucket (us-east-1) that mirrors the built Lambda@Edge function bundles published by CI. | `string` | `""` | no |
| <a name="input_function_versions"></a> [function\_versions](#input\_function\_versions) | Pinned published version per edge function. Terraform only redeploys a function when its version here changes. | `map(string)` | <pre>{<br/>  "filter-function": "1.0.0",<br/>  "geo-redirect": "1.0.0",<br/>  "prerender-proxy": "1.0.0",<br/>  "response-handler": "1.0.0",<br/>  "uri-rewrite": "1.0.0"<br/>}</pre> | no |
| <a name="input_lambda_associations"></a> [lambda\_associations](#input\_lambda\_associations) | Lambda function associations | <pre>list(object({<br/>    event_type  = string<br/>    lambda_name = string<br/>  }))</pre> | <pre>[<br/>  {<br/>    "event_type": "viewer-request",<br/>    "lambda_name": "filter-function"<br/>  },<br/>  {<br/>    "event_type": "origin-request",<br/>    "lambda_name": "prerender-proxy"<br/>  },<br/>  {<br/>    "event_type": "origin-response",<br/>    "lambda_name": "response-handler"<br/>  }<br/>]</pre> | no |
| <a name="input_ssl_certificate_arn"></a> [ssl\_certificate\_arn](#input\_ssl\_certificate\_arn) | SSL certificate ARN for the CloudFront distribution. | `string` | `""` | no |

## Outputs

| Name | Description |
| ---- | ----------- |
| <a name="output_assets_bucket_domain_name"></a> [assets\_bucket\_domain\_name](#output\_assets\_bucket\_domain\_name) | n/a |
| <a name="output_cloudfront_arn"></a> [cloudfront\_arn](#output\_cloudfront\_arn) | n/a |
| <a name="output_cloudfront_distribution_id"></a> [cloudfront\_distribution\_id](#output\_cloudfront\_distribution\_id) | n/a |
| <a name="output_cloudfront_domain_name"></a> [cloudfront\_domain\_name](#output\_cloudfront\_domain\_name) | n/a |
| <a name="output_edge_artifacts_bucket"></a> [edge\_artifacts\_bucket](#output\_edge\_artifacts\_bucket) | n/a |
| <a name="output_edge_publisher_user_name"></a> [edge\_publisher\_user\_name](#output\_edge\_publisher\_user\_name) | n/a |
| <a name="output_iam_user_pipeline_deployment_user_arn"></a> [iam\_user\_pipeline\_deployment\_user\_arn](#output\_iam\_user\_pipeline\_deployment\_user\_arn) | n/a |
| <a name="output_iam_user_pipeline_deployment_user_name"></a> [iam\_user\_pipeline\_deployment\_user\_name](#output\_iam\_user\_pipeline\_deployment\_user\_name) | n/a |
<!-- END_TF_DOCS -->
