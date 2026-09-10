# CloudFront Functions

CloudFront Functions for URI rewriting and other edge transformations that run at
the viewer request/response stage.

Each function is a yarn workspace under `packages/`. Functions are written in
TypeScript, built with esbuild, and **published to the GitHub Packages npm
registry** (`@krishanthisera/*`) by CI. Terraform consumes a pinned version of the
published artifact — it does not build anything.

## Structure

```text
cloudfront-functions/
├── packages/
│   └── uri-rewrite/               # URI rewriting function
│       ├── src/
│       │   ├── index.ts           # TypeScript source
│       │   └── index.test.ts      # Vitest tests
│       ├── esbuild.js             # Build script (ES2015 target)
│       ├── package.json           # @krishanthisera/uri-rewrite
│       ├── .releaserc.json        # semantic-release config (monorepo)
│       └── tsconfig.json
├── .npmrc                         # @krishanthisera scope -> GitHub Packages
├── package.json                   # Workspace root (private)
├── turbo.json                     # Turbo build/test pipeline
├── tsconfig.json                  # Shared TypeScript config
└── vitest.config.ts
```

`build/` output, `node_modules/`, `.turbo/` and coverage are git-ignored (see
`lib/.gitignore`). Nothing compiled is committed.

## Development

Yarn workspaces + Turbo, same pattern as `lib/lambda-at-edge/`.

```bash
# Install dependencies
yarn install

# Build / test every function
yarn build
yarn test

# Single function
yarn workspace @krishanthisera/uri-rewrite build
yarn workspace @krishanthisera/uri-rewrite test
```

## Publishing

Publishing is automated with [semantic-release](https://semantic-release.gitbook.io/)
via [`semantic-release-monorepo`](https://github.com/pmowrer/semantic-release-monorepo).

- **Trigger:** push to `main` touching `lib/cloudfront-functions/**`
  (workflow: [`.github/workflows/release-cloudfront-functions.yml`](../../.github/workflows/release-cloudfront-functions.yml)).
- **Version:** derived from [Conventional Commits](https://www.conventionalcommits.org/)
  that touch the function's own directory. `fix:` → patch, `feat:` → minor,
  `feat!:` / `BREAKING CHANGE:` → major. Commits that don't touch a package
  directory (e.g. Terraform changes) publish nothing.
- **Output:** an npm package `@krishanthisera/<fn>@X.Y.Z` in GitHub Packages,
  containing only `build/`, plus a git tag `@krishanthisera/<fn>-vX.Y.Z` and a
  GitHub Release with generated notes.
- **Auth:** the workflow's `GITHUB_TOKEN` (`permissions: packages: write`) — no
  PAT required.

The repo `version` field stays `0.0.0-development`; the real version lives in the
git tag and the published package (no `@semantic-release/git` plugin, so nothing
is committed back).

### Consuming from Terraform

Terraform pins an explicit version per function and reads the built artifact from
the registry (or an S3 mirror of it) — it never runs a build. Bumping a function
means merging a Conventional Commit, then pointing the version variable at the new
release. This removes the perpetual `source_code_hash` diff that came from
building and zipping on every `apply`.

## Adding a new function

1. Scaffold a package following `uri-rewrite`:

   ```bash
   mkdir -p packages/my-function/src
   ```

2. Add `src/index.ts`, `src/index.test.ts`, `esbuild.js`, `tsconfig.json`, and a
   `package.json` named `@krishanthisera/my-function` with `publishConfig`,
   `repository.directory`, and `files: ["build"]` (copy from `uri-rewrite`).

3. Add `packages/my-function/.releaserc.json` (identical to `uri-rewrite`'s).

4. Add a step/matrix entry in the release workflow so `semantic-release` also runs
   in `packages/my-function`.

5. Register the new function's pinned version in the Terraform edge-functions
   module.

6. `yarn build && yarn test`.

## CloudFront Functions vs Lambda@Edge

| Feature | CloudFront Functions | Lambda@Edge |
| ------- | ------------------- | ----------- |
| Runtime | JavaScript (ES2015) | Node.js |
| Location | `lib/cloudfront-functions/` | `lib/lambda-at-edge/` |
| Execution | Sub-millisecond | Milliseconds |
| Size limit | 10 KB | 1 MB (viewer), 50 MB (origin) |
| Network access | No | Yes |
| npm packages at runtime | No | Yes |
| Artifact | `@krishanthisera/<fn>` in GitHub Packages | `@krishanthisera/<fn>` in GitHub Packages |
| Use case | Simple transformations | Complex logic |
