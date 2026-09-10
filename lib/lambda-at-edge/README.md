# Lambda@Edge Functions

Lambda@Edge functions for the CloudFront distribution, written in TypeScript,
bundled with esbuild, and **published to the GitHub Packages npm registry**
(`@krishanthisera/*`) by CI. Terraform consumes a pinned version of each published
artifact — it does not build anything.

| Package | Event | Purpose |
| ------- | ----- | ------- |
| `@krishanthisera/filter-function` | `viewer-request` | Flags bot/crawler traffic with `x-request-prerender` |
| `@krishanthisera/prerender-proxy` | `origin-request` | Swaps the origin to a prerender service for flagged traffic |
| `@krishanthisera/geo-redirect` | `origin-request` | 302-redirects viewers to a locale path by country (not wired by default) |
| `@krishanthisera/response-handler` | `origin-response` | Sets `Cache-Control` on prerender responses; injects a custom error page |

## Runtime configuration — CloudFront origin custom headers

Lambda@Edge has **no runtime environment variables**. Per-deployment config is
delivered as **custom headers on the CloudFront origin**, configured in Terraform
(`custom_header` blocks on the `origin`) and read by the functions from
`request.origin.s3.customHeaders` / `request.origin.custom.customHeaders` (falling
back to `request.headers`).

| Header | Function | Default | Notes |
| ------ | -------- | ------- | ----- |
| `x-edge-cfg-prerender-token` | prerender-proxy | — | prerender.io token. On the prerender path it is placed on the prerender origin as `x-prerender-token`. It is always removed from `request.headers`, and on the non-prerender path also removed from the S3 origin custom headers, so it is never forwarded to S3. |
| `x-edge-cfg-prerender-url` | prerender-proxy | `service.prerender.io` | |
| `x-edge-cfg-path-prefix` | prerender-proxy | `""` | homepage path prefix |
| `x-edge-cfg-redirect-host` | geo-redirect | — | |
| `x-edge-cfg-supported-regions` | geo-redirect | `$^` (matches nothing) | regex of country codes, e.g. `AU|NZ|US` |
| `x-edge-cfg-default-region` | geo-redirect | `""` | |
| `x-edge-cfg-cache-key` | response-handler | `x-prerender-requestid` | response header that marks a prerender hit |
| `x-edge-cfg-cache-max-age` | response-handler | `10` | |
| `x-edge-cfg-error-page` | response-handler | `https://blog.bizkt.com.au/404.html` | |

`prerender-proxy` reads its config before swapping the origin, so config only needs
to be set on the S3 origin. If `response-handler` needs non-default config on
*prerendered* responses (whose origin is the prerender service, not S3), set the
same `x-edge-cfg-*` custom headers on the prerender origin too.

> Note: on the non-prerender path the S3 origin still receives any `x-edge-cfg-*`
> headers other than `x-edge-cfg-prerender-token` (which is stripped). The rest are
> harmless (S3 ignores unknown headers) but visible to S3 access logging if enabled.

## Structure

```text
lambda-at-edge/
├── packages/
│   ├── filter-function/
│   ├── prerender-proxy/
│   ├── geo-redirect/
│   └── response-handler/
│       ├── src/
│       │   ├── index.ts        # handler (reads config via readConfig())
│       │   └── index.test.ts   # Vitest
│       ├── esbuild.js          # single-entry CJS bundle, node22, no env injection
│       ├── package.json        # @krishanthisera/<name>
│       └── .releaserc.json     # semantic-release (monorepo)
├── .npmrc                      # @krishanthisera scope -> GitHub Packages
├── .nvmrc                      # 26.5
├── package.json                # workspace root (private)
├── turbo.json
├── tsconfig.json
└── vitest.config.ts
```

`build/`, `node_modules/`, `.turbo/`, coverage are git-ignored (`lib/.gitignore`).

## Development

```bash
yarn install
yarn build          # turbo -> esbuild, all packages
yarn test           # turbo -> vitest, all packages

yarn workspace @krishanthisera/prerender-proxy test
```

## Publishing

Automated with [semantic-release](https://semantic-release.gitbook.io/) +
[`semantic-release-monorepo`](https://github.com/pmowrer/semantic-release-monorepo),
identical to `lib/cloudfront-functions/` — see that package's
[README](../cloudfront-functions/README.md#publishing).

- **Trigger:** push to `main` touching `lib/lambda-at-edge/**`
  ([`.github/workflows/release-lambda-at-edge.yml`](../../.github/workflows/release-lambda-at-edge.yml),
  one matrix job per package).
- **Version:** Conventional Commits that touch the package's own directory.
- **Output:** `@krishanthisera/<fn>@X.Y.Z` in GitHub Packages (tarball contains
  only `build/`), tag `@krishanthisera/<fn>-vX.Y.Z`, and a GitHub Release.

## Consuming from Terraform (pending migration)

The edge-functions Terraform module pins a version per function, pulls the built
`index.js` from the registry (or an S3 mirror), and:

1. Creates each `aws_lambda_function` (`runtime = nodejs22.x`, `handler = index.handler`,
   `publish = true`) in `us-east-1`.
2. Adds `custom_header` blocks to the CloudFront `origin` for every `x-edge-cfg-*`
   value above.
3. Associates the functions by `event_type`.

No build runs during `terraform apply`, which removes the perpetual
`source_code_hash` diff.
