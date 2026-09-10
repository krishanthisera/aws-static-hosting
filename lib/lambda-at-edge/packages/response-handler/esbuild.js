import { build } from "esbuild"

// Bundle src/index.ts into a single self-contained CommonJS file for Lambda@Edge.
// No env-var injection: per-deployment config is delivered at runtime via
// CloudFront origin custom headers (see the package README).
await build({
  entryPoints: ["src/index.ts"],
  outfile: "./build/index.js",
  platform: "node",
  target: "node22",
  format: "cjs",
  bundle: true,
  sourcemap: false,
  logLevel: "info",
})
