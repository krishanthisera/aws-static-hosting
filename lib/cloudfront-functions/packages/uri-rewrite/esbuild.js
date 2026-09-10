#!/usr/bin/env node

/**
 * Build script for CloudFront Functions
 * CloudFront Functions require ES5.1 compatible JavaScript
 * 
 * This script uses esbuild to compile and bundle the TypeScript code
 */

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

// Ensure build directory exists
mkdirSync("./build", { recursive: true });

await build({
  entryPoints: ["src/index.ts"],
  platform: "neutral", // Not node or browser - it's CloudFront's runtime
  target: "es2015", // Target ES2015, then we'll transpile further if needed
  format: "esm",
  outfile: "./build/index.js",
  sourcemap: false,
  logLevel: "info",
  bundle: true,
  minify: false, // Keep readable for now, can minify later if size is a concern
  treeShaking: true,
});

// CloudFront Functions need the handler to be a function declaration, not export
// Post-process the output to make it CloudFront-compatible
const built = readFileSync("./build/index.js", "utf8");

// Extract the handler function and make it CloudFront-compatible
const cloudFrontCompatible = built
  .replace(/export \{[^}]+\};?\s*$/m, "") // Remove export statement
  .replace(/export function handler/, "function handler") // Make handler a regular function
  .trim();

writeFileSync("./build/index.js", cloudFrontCompatible);

console.log("✓ CloudFront Function built successfully");
console.log(`  Output: ./build/index.js (${cloudFrontCompatible.length} bytes)`);
