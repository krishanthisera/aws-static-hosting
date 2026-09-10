# edge-functions module

Deploys the CloudFront edge compute for the `aws-static-hosting` stack:

- **Lambda@Edge** functions (`filter-function`, `prerender-proxy`, `geo-redirect`,
  `response-handler`) for viewer filtering, prerender proxying, geo redirects and
  response shaping.
- **CloudFront Functions** (`uri-rewrite`) for sub-millisecond URI rewrites.

It **builds nothing**. Function source lives in `lib/lambda-at-edge/` and
`lib/cloudfront-functions/` and is published to GitHub Packages by CI. This
module consumes a **pinned version** of each artifact, so `terraform plan` only
shows a change when a version is bumped — never a perpetual `source_code_hash`
diff, and no download during `plan`/`apply`.

## How the code reaches each function

| Compute | Source | Redeploys when |
|---|---|---|
| Lambda@Edge | `aws_lambda_function` reads `s3://<artifacts_bucket>/lambda-at-edge/<fn>/<version>.zip` directly (`s3_key` carries the version; no `source_code_hash`, no data source). CI uploads the zip on release. | `var.function_versions[<fn>]` changes |
| CloudFront Function | `aws_cloudfront_function.code` is inline only — no S3/URL source exists — so the caller passes the **committed** built bundle (`lib/cloudfront-functions/packages/<fn>/build/index.js`) via `var.cloudfront_function_code`. A pre-commit hook keeps it rebuilt. | that committed file changes |

The module builds only the functions actually referenced by
`var.lambda_associations` / `var.cloudfront_function_associations`.

## Usage

Invoked by the root module (`edge-functions.tf`):

```hcl
module "edge_functions" {
  source = "./modules/edge-functions"

  providers = { aws = aws.us_east_1 }

  artifacts_bucket  = aws_s3_bucket.edge_artifacts.bucket
  function_versions = var.function_versions          # { <fn> = "1.0.0", ... }
  lambda_associations  = var.lambda_associations
  cloudfront_function_associations = var.cloudfront_function_associations
  name_prefix          = "example-com-"

  cloudfront_function_code = {
    uri-rewrite = file("${path.module}/lib/cloudfront-functions/packages/uri-rewrite/build/index.js")
  }
}
```

Outputs `lambda_qualified_arns` and `cloudfront_function_arns` (name → ARN maps)
for the distribution's `lambda_function_association` / `function_association`
blocks.

## Bumping a function

1. Merge a Conventional Commit touching the function's package — CI publishes the
   new version and uploads its zip to the artifacts bucket.
2. Set the new version in the root `function_versions` map.
3. `terraform apply` — only that function updates.

(`uri-rewrite`: the pre-commit hook rebuilds the committed bundle; just commit it.)

## Runtime configuration

Lambda@Edge has no environment variables. Per-deployment config (`x-edge-cfg-*`)
is delivered as CloudFront **origin custom headers** — see
`lib/lambda-at-edge/README.md`. Wiring those `custom_header` blocks is a separate
follow-up; this module does not manage them yet.

<!-- BEGIN_TF_DOCS -->
## Requirements

| Name | Version |
| ---- | ------- |
| <a name="requirement_terraform"></a> [terraform](#requirement\_terraform) | ~> 1.15 |
| <a name="requirement_aws"></a> [aws](#requirement\_aws) | ~> 6.55 |

## Providers

| Name | Version |
| ---- | ------- |
| <a name="provider_aws"></a> [aws](#provider\_aws) | ~> 6.55 |

## Resources

| Name | Type |
| ---- | ---- |
| [aws_cloudfront_function.cloudfront_function_associations](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_function) | resource |
| [aws_iam_role.lambda_edge_exec](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_iam_role_policy_attachment.lambda_edge_logs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment) | resource |
| [aws_lambda_function.lambda_at_edge](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function) | resource |

## Inputs

| Name | Description | Type | Default | Required |
| ---- | ----------- | ---- | ------- | :------: |
| <a name="input_artifacts_bucket"></a> [artifacts\_bucket](#input\_artifacts\_bucket) | Name of the S3 bucket (us-east-1) holding the built Lambda@Edge bundles, keyed lambda-at-edge/<fn>/<version>.zip. | `string` | n/a | yes |
| <a name="input_cloudfront_function_code"></a> [cloudfront\_function\_code](#input\_cloudfront\_function\_code) | Map of CloudFront Function name => JS source. aws\_cloudfront\_function has no S3/URL code source, so the caller passes the committed built bundle (e.g. file(...) on lib/cloudfront-functions/packages/<fn>/build/index.js). | `map(string)` | `{}` | no |
| <a name="input_cloudfront_function_associations"></a> [cloudfront\_functions](#input\_cloudfront\_functions) | CloudFront Function associations; the module builds only the functions referenced here. | <pre>list(object({<br/>    event_type  = string<br/>    lambda_name = string<br/>  }))</pre> | `[]` | no |
| <a name="input_function_versions"></a> [function\_versions](#input\_function\_versions) | Pinned published version per edge function. A function is only redeployed when its version here changes. | `map(string)` | n/a | yes |
| <a name="input_lambda_associations"></a> [lambda\_associations](#input\_lambda\_associations) | Lambda@Edge associations; the module builds only the functions referenced here. | <pre>list(object({<br/>    event_type  = string<br/>    lambda_name = string<br/>  }))</pre> | `[]` | no |
| <a name="input_name_prefix"></a> [name\_prefix](#input\_name\_prefix) | Prefix prepended to function names (Lambda@Edge names are account+region global). | `string` | `""` | no |

## Outputs

| Name | Description |
| ---- | ----------- |
| <a name="output_cloudfront_function_arns"></a> [cloudfront\_function\_arns](#output\_cloudfront\_function\_arns) | Map of function name => ARN, for function\_association. |
| <a name="output_lambda_qualified_arns"></a> [lambda\_qualified\_arns](#output\_lambda\_qualified\_arns) | Map of function name => qualified (versioned) ARN, for lambda\_function\_association. |
<!-- END_TF_DOCS -->
