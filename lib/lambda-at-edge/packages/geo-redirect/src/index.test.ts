import { describe, it, expect, vi } from "vitest"
import type { CloudFrontRequestEvent, CloudFrontResponse, CloudFrontRequest, CloudFrontHeaders } from "aws-lambda"

vi.mock("source-map-support/register", () => ({}))

import { handler } from "./index"

const DEFAULT_CONFIG: Record<string, string> = {
  "x-edge-cfg-redirect-host": "example.com",
  "x-edge-cfg-supported-regions": "AU|NZ|US",
  "x-edge-cfg-default-region": "au",
}

function toHeaders(values: Record<string, string>): CloudFrontHeaders {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, [{ key, value }]]))
}

function makeEvent(
  uri: string,
  countryCode?: string,
  extraHeaders: Record<string, Array<{ key: string; value: string }>> = {},
  config: Record<string, string> = DEFAULT_CONFIG,
): CloudFrontRequestEvent {
  const headers: Record<string, Array<{ key: string; value: string }>> = {
    host: [{ key: "Host", value: "example.com" }],
    ...toHeaders(config),
    ...extraHeaders,
  }
  if (countryCode) {
    headers["cloudfront-viewer-country"] = [{ key: "CloudFront-Viewer-Country", value: countryCode }]
  }
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
            headers,
          },
        },
      },
    ],
  }
}

describe("geo-redirect handler", () => {
  describe("redirect behaviour", () => {
    it("returns 302 for a supported country code", async () => {
      const event = makeEvent("/products", "AU")
      const result = (await handler(event)) as CloudFrontResponse
      expect(result.status).toBe("302")
      expect(result.statusDescription).toBe("Found")
    })

    it("redirects a supported country to its lowercased locale path", async () => {
      const event = makeEvent("/products", "AU")
      const result = (await handler(event)) as CloudFrontResponse
      expect(result.headers.location[0].value).toBe("https://example.com/au/products")
    })

    it("redirects an unsupported country to the default region path", async () => {
      const event = makeEvent("/products", "DE")
      const result = (await handler(event)) as CloudFrontResponse
      expect(result.headers.location[0].value).toBe("https://example.com/au/products")
    })

    it("lowercases the country code in the redirect path", async () => {
      const event = makeEvent("/page", "NZ")
      const result = (await handler(event)) as CloudFrontResponse
      expect(result.headers.location[0].value).toContain("/nz/")
    })

    it("strips trailing slash from the redirect URL", async () => {
      const event = makeEvent("/", "AU")
      const result = (await handler(event)) as CloudFrontResponse
      expect(result.headers.location[0].value).not.toMatch(/\/$/)
      expect(result.headers.location[0].value).toBe("https://example.com/au")
    })
  })

  describe("pass-through conditions", () => {
    it("returns original request when cloudfront-viewer-country header is absent", async () => {
      const event = makeEvent("/products")
      const result = (await handler(event)) as CloudFrontRequest
      expect((result as CloudFrontResponse).status).toBeUndefined()
      expect(result.uri).toBe("/products")
    })

    it("returns original request when x-prerender header is present", async () => {
      const event = makeEvent("/products", "AU", {
        "x-prerender": [{ key: "x-prerender", value: "true" }],
      })
      const result = (await handler(event)) as CloudFrontRequest
      expect((result as CloudFrontResponse).status).toBeUndefined()
    })

    it("returns original request when x-request-prerender header is present", async () => {
      const event = makeEvent("/products", "AU", {
        "x-request-prerender": [{ key: "x-request-prerender", value: "true" }],
      })
      const result = (await handler(event)) as CloudFrontRequest
      expect((result as CloudFrontResponse).status).toBeUndefined()
    })

    it("does not treat any country as supported when no regions are configured", async () => {
      const event = makeEvent(
        "/products",
        "AU",
        {},
        { "x-edge-cfg-redirect-host": "example.com", "x-edge-cfg-default-region": "au" },
      )
      const result = (await handler(event)) as CloudFrontResponse
      expect(result.headers.location[0].value).toBe("https://example.com/au/products")
    })
  })
})
