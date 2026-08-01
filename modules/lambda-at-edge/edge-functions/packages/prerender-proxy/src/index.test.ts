import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import type { CloudFrontRequestEvent, CloudFrontRequest } from "aws-lambda"

vi.mock("source-map-support/register", () => ({}))

function makeEvent(
  uri: string,
  extraHeaders: Record<string, Array<{ key: string; value: string }>> = {},
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
              ...extraHeaders,
            },
          },
        },
      },
    ],
  }
}

describe("prerender-proxy handler", () => {
  let handler: (event: CloudFrontRequestEvent) => Promise<CloudFrontRequest>

  beforeAll(async () => {
    vi.stubEnv("PRERENDER_TOKEN", "test-token-123")
    vi.stubEnv("PATH_PREFIX", "")
    vi.stubEnv("PRERENDER_URL", "service.prerender.io")
    vi.resetModules()
    const mod = await import("./index")
    handler = mod.handler as typeof handler
  })

  afterAll(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  describe("prerender mode (x-request-prerender header set)", () => {
    const prerenderHeaders = {
      "x-request-prerender": [{ key: "x-request-prerender", value: "true" }],
      "x-prerender-host": [{ key: "X-Prerender-Host", value: "example.com" }],
    }

    it("sets the request origin domain to the prerender service URL", async () => {
      const event = makeEvent("/page", prerenderHeaders)
      const result = await handler(event)
      expect(result.origin?.custom?.domainName).toBe("service.prerender.io")
    })

    it("sets origin protocol to https on port 443", async () => {
      const event = makeEvent("/page", prerenderHeaders)
      const result = await handler(event)
      expect(result.origin?.custom?.protocol).toBe("https")
      expect(result.origin?.custom?.port).toBe(443)
    })

    it("sets the origin path to the URL-encoded prerender host", async () => {
      const event = makeEvent("/page", prerenderHeaders)
      const result = await handler(event)
      expect(result.origin?.custom?.path).toBe("/https%3A%2F%2Fexample.com")
    })

    it("injects the prerender token into custom headers", async () => {
      const event = makeEvent("/page", prerenderHeaders)
      const result = await handler(event)
      expect(result.origin?.custom?.customHeaders?.["x-prerender-token"]?.[0].value).toBe("test-token-123")
    })

    it("rewrites /index.html URI to / so the homepage is rendered correctly", async () => {
      const event = makeEvent("/index.html", prerenderHeaders)
      const result = await handler(event)
      expect(result.uri).toBe("/")
    })

    it("does not rewrite URIs other than /index.html", async () => {
      const event = makeEvent("/about/index.html", prerenderHeaders)
      const result = await handler(event)
      expect(result.uri).toBe("/about/index.html")
    })
  })

  describe("non-prerender mode (no x-request-prerender header)", () => {
    it("appends index.html to URIs ending with /", async () => {
      const event = makeEvent("/about/")
      const result = await handler(event)
      expect(result.uri).toBe("/about/index.html")
    })

    it("appends /index.html to URIs without a file extension", async () => {
      const event = makeEvent("/about")
      const result = await handler(event)
      expect(result.uri).toBe("/about/index.html")
    })

    it("converts root path / to /index.html", async () => {
      const event = makeEvent("/")
      const result = await handler(event)
      expect(result.uri).toBe("/index.html")
    })

    it("leaves URIs that already have a file extension unchanged", async () => {
      const event = makeEvent("/assets/script.js")
      const result = await handler(event)
      expect(result.uri).toBe("/assets/script.js")
    })

    it("does not modify the origin in non-prerender mode", async () => {
      const event = makeEvent("/about")
      const result = await handler(event)
      expect(result.origin).toBeUndefined()
    })
  })
})
