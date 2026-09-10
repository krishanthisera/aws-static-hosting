# Edge Libraries

Edge code for the CloudFront distribution. Two libraries, one per CloudFront
compute type. Both are TypeScript yarn-workspace monorepos, bundled with esbuild,
tested with Vitest, and **published to the GitHub Packages npm registry**
(`@krishanthisera/*`) by CI. Terraform consumes a pinned published version of each
function — it does not build anything.

| Library | CloudFront compute | Runs at | Use for |
| ------- | ------------------ | ------- | ------- |
| [`cloudfront-functions/`](cloudfront-functions/README.md) | CloudFront Functions | `viewer-request` / `viewer-response` | Lightweight, sub-millisecond URI/header rewrites (JS runtime, no network, no `require`) |
| [`lambda-at-edge/`](lambda-at-edge/README.md) | Lambda@Edge | `viewer-*` / `origin-*` | Heavier logic — origin swaps, prerender proxying, geo redirects, response shaping (full Node.js runtime) |

## Functions

**`cloudfront-functions/`**

- `uri-rewrite` — rewrites request URIs (e.g. directory paths to `index.html`).

**`lambda-at-edge/`**

- `filter-function` (`viewer-request`) — flags bot/crawler traffic.
- `prerender-proxy` (`origin-request`) — swaps the origin to a prerender service for flagged traffic.
- `geo-redirect` (`origin-request`) — redirects viewers to a locale path by country.
- `response-handler` (`origin-response`) — sets `Cache-Control` on prerender responses and injects a custom error page.

See each library's `README.md` for structure, build/test commands, and runtime
configuration.
