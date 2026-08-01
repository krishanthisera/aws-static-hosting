# AWS Lambda@Edge Functions Module

A local Terraform module that deploys Lambda@Edge functions to enable prerendering and enhanced CloudFront request handling for static websites and Single Page Applications (SPAs).

This module is part of the [aws-static-hosting](https://github.com/krishanthisera/aws-static-hosting) infrastructure and is automatically invoked by the root module.

## Architecture

```
  CloudFront Distribution
         │
         ├── Viewer Request  ──►  filter-function   (should this request be prerendered?)
         │
         ├── Origin Request  ──►  prerender-proxy   (proxy to Prerender.io for bots/crawlers)
         │
         ├── Origin Request  ──►  geo-redirect      (redirect based on geographic location)
         │
         └── Origin Response ──►  response-handler  (set cache-control headers)
```

## Lambda@Edge Functions

| Function | CloudFront Event | Description |
|---|---|---|
| `filter-function` | Viewer Request | Inspects the incoming request and determines whether it should be forwarded to the prerender service |
| `prerender-proxy` | Origin Request | Proxies bot/crawler traffic to [Prerender.io](https://prerender.io) and returns a server-side rendered HTML response |
| `geo-redirect` | Origin Request | Redirects users to region-specific origins based on their geographic location |
| `response-handler` | Origin Response | Applies cache-control headers to origin responses |

## Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) `~> 1.15`
- [Node.js](https://nodejs.org) `>= 22.x`
- [Yarn](https://yarnpkg.com) `>= 1.22`

## Usage

This module is automatically invoked by the root `aws-static-hosting` module. The root module passes Lambda associations to CloudFront:

```hcl
# In the root module
module "lambda_at_edge" {
  source = "./modules/lambda-at-edge"
  
  providers = {
    aws = aws.us_east_1
  }
}
```

The module builds and deploys the functions defined in `edge-functions/packages/`. The root module then associates these functions with CloudFront events via the `lambda_associations` variable.

## Environment Variables

Lambda@Edge functions **cannot** use runtime environment variables. Instead, esbuild bakes them in at build time. Create a `.env` file in `modules/lambda-at-edge/edge-functions/` before building:

| Variable | Function | Description |
|---|---|---|
| `PRERENDER_TOKEN` | `prerender-proxy` | API token for Prerender.io |
| `PRERENDER_URL` | `prerender-proxy` | Prerender service base URL (e.g. `service.prerender.io`) |
| `PATH_PREFIX` | `prerender-proxy` | URL path prefix to strip before forwarding |

Example `.env` file:

```bash
PRERENDER_TOKEN=your_token_here
PRERENDER_URL=service.prerender.io
PATH_PREFIX=/blog
```

## Development

All development commands should be run from the `modules/lambda-at-edge` directory.

### Install dependencies

```sh
cd modules/lambda-at-edge
make install
```

### Build all functions

```sh
make build
```

Functions are automatically built by Terraform during `terraform apply` via a `null_resource` trigger.

### Run tests

```sh
make test

# Per-function
make test-prerender-proxy
make test-filter-function
make test-geo-redirect
make test-response-handler
```

### Lint and format

```sh
make lint        # check
make lint-fix    # auto-fix
make format      # check
make format-fix  # auto-fix
```

### Regenerate Terraform docs

```sh
make docs
```

Requires [`terraform-docs`](https://terraform-docs.io/user-guide/installation/) to be installed.

## Project Structure

```
modules/lambda-at-edge/
├── edge-functions/              # TypeScript source code
│   ├── packages/
│   │   ├── filter-function/     # Viewer request filter
│   │   ├── geo-redirect/        # Geographic redirect
│   │   ├── prerender-proxy/     # Prerender.io proxy
│   │   └── response-handler/    # Response header handler
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── *.tf                         # Terraform configuration
├── Makefile                     # Build automation
└── README.md                    # This file
```

## Contributing

Pull requests and issues are welcome at the [aws-static-hosting repository](https://github.com/krishanthisera/aws-static-hosting). Please open an issue first for significant changes.

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
| <a name="provider_archive"></a> [archive](#provider\_archive) | 2.8.0 |
| <a name="provider_aws"></a> [aws](#provider\_aws) | 6.55.0 |
| <a name="provider_null"></a> [null](#provider\_null) | 3.3.0 |

## Resources

| Name | Type |
| ---- | ---- |
| [aws_iam_role.lambda_edge_exec](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role) | resource |
| [aws_lambda_function.edge_functions](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function) | resource |
| [null_resource.build_edge_functions](https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource) | resource |
| [null_resource.check_node_version](https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource) | resource |

## Inputs

| Name | Description | Type | Default | Required |
| ---- | ----------- | ---- | ------- | :------: |
| <a name="input_edge_function_path"></a> [edge\_function\_path](#input\_edge\_function\_path) | n/a | `string` | `"edge-functions"` | no |

## Outputs

| Name | Description |
| ---- | ----------- |
| <a name="output_function_arns"></a> [function\_arns](#output\_function\_arns) | n/a |
<!-- END_TF_DOCS -->
