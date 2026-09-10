# @krishanthisera/uri-rewrite

CloudFront Function that rewrites URIs to append `index.html` for directory
requests, enabling clean URLs for static sites. Runs at the `viewer-request`
stage with sub-millisecond execution.

Behaviour:

- Paths ending in `/` → append `index.html`
- Paths with no file extension → append `/index.html`
- Static assets (path has a file extension) → unchanged

## Development

Written in TypeScript for type safety and testability; compiled to ES2015 (the
CloudFront Functions runtime) with esbuild.

```text
uri-rewrite/
├── src/
│   ├── index.ts          # TypeScript source
│   └── index.test.ts     # Vitest tests
├── esbuild.js            # Build script
├── package.json          # @krishanthisera/uri-rewrite
├── .releaserc.json       # semantic-release config
└── tsconfig.json
```

`build/index.js` is generated and git-ignored — CI builds it before publishing.

```bash
# From the workspace root (lib/cloudfront-functions)
yarn workspace @krishanthisera/uri-rewrite build
yarn workspace @krishanthisera/uri-rewrite test

# From this directory
npm run build
npm test
npm run test:watch
```

## Publishing

Automated — see [`../../README.md`](../../README.md#publishing). A Conventional
Commit touching this directory, merged to `main`, cuts a new
`@krishanthisera/uri-rewrite@X.Y.Z` in GitHub Packages and tags
`@krishanthisera/uri-rewrite-vX.Y.Z`.

The published tarball contains only `build/` (`files: ["build"]`), with
`build/index.js` as `main`.

## Consuming

Terraform's edge-functions module pins a specific version and feeds the built
`index.js` to `aws_cloudfront_function.code`. It does not build from source.

## Testing

18 Vitest cases: trailing-slash directories, extensionless paths, static files
(`.js`/`.css`/`.png`), query strings, multiple dots, nested paths.

### Input → Output

```text
/                → /index.html
/blog/           → /blog/index.html
/docs/guide/     → /docs/guide/index.html
/about           → /about/index.html
/blog/my-post    → /blog/my-post/index.html
/bundle.js       → /bundle.js
/styles.css      → /styles.css
/logo.png        → /logo.png
```
