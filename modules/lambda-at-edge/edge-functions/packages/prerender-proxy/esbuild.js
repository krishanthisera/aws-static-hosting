import { build } from "esbuild"
import fg from "fast-glob"
import "dotenv/config"

/**
 * If the ENV is not set
 * The build will be interrupted
 */
const define = {
  "process.env.PRERENDER_TOKEN": `"${process.env.PRERENDER_TOKEN}"`,
}

// For optional ENVs
for (const k in process.env) {
  define[`process.env.${k}`] = JSON.stringify(process.env[k])
}

export const buildNode = async ({ ...args }) => {
  await build({
    entryPoints: await fg("src/*.ts"),
    platform: "node",
    target: "node22",
    format: "cjs",
    outdir: "./build",
    sourcemap: true,
    bundle: true,
    logLevel: "info",
    define,
    ...args,
  })
}

await buildNode({})
