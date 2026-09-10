import { describe, it, expect, vi } from "vitest"
import type { CloudFrontRequestEvent, CloudFrontRequest, CloudFrontHeaders } from "aws-lambda"

vi.mock("source-map-support/register", () => ({}))

import { handler } from "./index"

// Non-secret defaults shared by most tests. The prerender token is always supplied
// per-test (see the "prerender token handling" block).
const DEFAULT_CONFIG: Record<string, string> = {
  "x-edge-cfg-path-prefix": "",
  "x-edge-cfg-prerender-url": "service.prerender.io",
}

function toHeaders(values: Record<string, string>): CloudFrontHeaders {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, [{ key, value }]]))
}

function makeEvent(
  uri: string,
  extraHeaders: Record<string, Array<{ key: string; value: string }>> = {},
  {
    config = DEFAULT_CONFIG,
    originConfig,
  }: { config?: Record<string, string>; originConfig?: Record<string, string> } = {},
): CloudFrontRequestEvent {
  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: "test.cloudfront.net",
            distributionId: "TESTID",
            eventType: "origin-request",
            requestId: "test-request-id",
          },
          request: {
            clientIp: "1.2.3.4",
            method: "GET",
            uri,
            querystring: "",
            headers: {
              host: [{ key: "Host", value: "example.com" }],
              ...toHeaders(config),
              ...extraHeaders,
            },
            ...(originConfig
              ? {
                  origin: {
                    s3: {
                      domainName: "bucket.s3.amazonaws.com",
                      path: "",
                      region: "us-east-1",
                      authMethod: "origin-access-identity",
                      customHeaders: toHeaders(originConfig),
                    },
                  },
                }
              : {}),
          },
        },
      },
    ],
  }
}

describe("prerender-proxy handler", () => {
  describe("prerender mode (x-request-prerender header set)", () => {
    const prerenderHeaders = {
      "x-request-prerender": [{ key: "x-request-prerender", value: "true" }],
      "x-prerender-host": [{ key: "X-Prerender-Host", value: "example.com" }],
    }

    it("sets the request origin domain to the prerender service URL", async () => {
      const event = makeEvent("/page", prerenderHeaders)
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.origin?.custom?.domainName).toBe("service.prerender.io")
    })

    it("sets origin protocol to https on port 443", async () => {
      const event = makeEvent("/page", prerenderHeaders)
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.origin?.custom?.protocol).toBe("https")
      expect(result.origin?.custom?.port).toBe(443)
    })

    it("sets the origin path to the URL-encoded prerender host", async () => {
      const event = makeEvent("/page", prerenderHeaders)
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.origin?.custom?.path).toBe("/https%3A%2F%2Fexample.com")
    })

    it("rewrites /index.html URI to / so the homepage is rendered correctly", async () => {
      const event = makeEvent("/index.html", prerenderHeaders)
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.uri).toBe("/")
    })

    it("does not rewrite URIs other than /index.html", async () => {
      const event = makeEvent("/about/index.html", prerenderHeaders)
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.uri).toBe("/about/index.html")
    })
  })

  describe("non-prerender mode (no x-request-prerender header)", () => {
    it("appends index.html to URIs ending with /", async () => {
      const event = makeEvent("/about/")
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.uri).toBe("/about/index.html")
    })

    it("appends /index.html to URIs without a file extension", async () => {
      const event = makeEvent("/about")
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.uri).toBe("/about/index.html")
    })

    it("converts root path / to /index.html", async () => {
      const event = makeEvent("/")
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.uri).toBe("/index.html")
    })

    it("leaves URIs that already have a file extension unchanged", async () => {
      const event = makeEvent("/assets/script.js")
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.uri).toBe("/assets/script.js")
    })

    it("does not modify the origin in non-prerender mode", async () => {
      const event = makeEvent("/about")
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.origin).toBeUndefined()
    })
  })

  describe("prerender token handling", () => {
    const prerenderHeaders = {
      "x-request-prerender": [{ key: "x-request-prerender", value: "true" }],
      "x-prerender-host": [{ key: "X-Prerender-Host", value: "example.com" }],
    }

    const tokenHeader = (value: string) => ({
      "x-edge-cfg-prerender-token": [{ key: "x-edge-cfg-prerender-token", value }],
    })

    it("reads the token from the x-edge-cfg-prerender-token request header and forwards it to the prerender origin", async () => {
      const event = makeEvent("/page", { ...prerenderHeaders, ...tokenHeader("hdr-token-1") }, { config: {} })
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.origin?.custom?.customHeaders?.["x-prerender-token"]?.[0].value).toBe("hdr-token-1")
    })

    it("reads the token from an origin custom header when set", async () => {
      const event = makeEvent("/page", prerenderHeaders, {
        config: {},
        originConfig: { "x-edge-cfg-prerender-token": "origin-token-2" },
      })
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.origin?.custom?.customHeaders?.["x-prerender-token"]?.[0].value).toBe("origin-token-2")
    })

    it("prefers the origin custom header over the request header", async () => {
      const event = makeEvent(
        "/page",
        { ...prerenderHeaders, ...tokenHeader("hdr-token") },
        {
          config: {},
          originConfig: { "x-edge-cfg-prerender-token": "origin-token" },
        },
      )
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.origin?.custom?.customHeaders?.["x-prerender-token"]?.[0].value).toBe("origin-token")
    })

    it("forwards an empty token when no token header is present", async () => {
      const event = makeEvent("/page", prerenderHeaders, { config: {} })
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.origin?.custom?.customHeaders?.["x-prerender-token"]?.[0].value).toBe("")
    })

    it("removes the token request header from the forwarded request (prerender path)", async () => {
      const event = makeEvent("/page", { ...prerenderHeaders, ...tokenHeader("hdr-token") }, { config: {} })
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.headers["x-edge-cfg-prerender-token"]).toBeUndefined()
    })

    it("removes the token request header from the forwarded request (non-prerender path)", async () => {
      const event = makeEvent("/about", tokenHeader("hdr-token"), { config: {} })
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.headers["x-edge-cfg-prerender-token"]).toBeUndefined()
    })

    it("removes the token origin custom header before forwarding to the S3 origin (non-prerender path)", async () => {
      const event = makeEvent(
        "/about",
        {},
        {
          config: {},
          originConfig: { "x-edge-cfg-prerender-token": "secret", "x-edge-cfg-path-prefix": "" },
        },
      )
      const result = (await handler(event)) as CloudFrontRequest
      expect(result.origin?.s3?.customHeaders?.["x-edge-cfg-prerender-token"]).toBeUndefined()
    })
  })
})
