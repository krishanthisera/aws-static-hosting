import { describe, it, expect, vi, beforeEach } from "vitest"
import type { CloudFrontResponseEvent } from "aws-lambda"

vi.mock("source-map-support/register", () => ({}))

const mockGet = vi.hoisted(() => vi.fn())
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({ get: mockGet })),
  },
}))

import { handler } from "./index"

function makeEvent(
  status: string,
  headers: Record<string, Array<{ key: string; value: string }>> = {},
  body?: string,
): CloudFrontResponseEvent {
  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: "test.cloudfront.net",
            distributionId: "TESTID",
            eventType: "origin-response",
            requestId: "test-request-id",
          },
          request: {
            clientIp: "1.2.3.4",
            method: "GET",
            uri: "/page",
            querystring: "",
            headers: {},
          },
          response: {
            status,
            statusDescription: status === "200" ? "OK" : "Error",
            headers,
            ...(body !== undefined ? { body } : {}),
          },
        },
      },
    ],
  }
}

describe("response-handler handler", () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  describe("prerender cache-control", () => {
    it("sets a Cache-Control header when the prerender request-id header is present", async () => {
      const event = makeEvent("200", {
        "x-prerender-requestid": [{ key: "x-prerender-requestid", value: "abc123" }],
      })
      const result = await handler(event)
      expect(result.headers["Cache-Control"]).toBeDefined()
      expect(result.headers["Cache-Control"][0].value).toMatch(/max-age=\d+/)
    })

    it("uses the default cache max-age of 10", async () => {
      const event = makeEvent("200", {
        "x-prerender-requestid": [{ key: "x-prerender-requestid", value: "abc123" }],
      })
      const result = await handler(event)
      expect(result.headers["Cache-Control"][0].value).toBe("max-age=10")
    })
  })

  describe("error page injection", () => {
    it("fetches and injects the custom error page body for a non-200 response", async () => {
      mockGet.mockResolvedValueOnce({ data: "<html><body>Not Found</body></html>" })
      const event = makeEvent("404")
      const result = await handler(event)
      expect(result.body).toBe("<html><body>Not Found</body></html>")
    })

    it("sets content-type to text/html when injecting the error page", async () => {
      mockGet.mockResolvedValueOnce({ data: "<html>error</html>" })
      const event = makeEvent("500")
      const result = await handler(event)
      expect(result.headers["content-type"][0].value).toBe("text/html")
    })

    it("removes the content-length header when injecting the error page", async () => {
      mockGet.mockResolvedValueOnce({ data: "<html>error</html>" })
      const event = makeEvent("503", {
        "content-length": [{ key: "Content-Length", value: "42" }],
      })
      const result = await handler(event)
      expect(result.headers["content-length"]).toBeUndefined()
    })

    it("returns the original response unchanged when the error page fetch fails", async () => {
      mockGet.mockRejectedValueOnce(new Error("Network timeout"))
      const event = makeEvent("502")
      const result = await handler(event)
      expect(result.status).toBe("502")
      expect(result.body).toBeUndefined()
    })
  })

  describe("200 pass-through", () => {
    it("returns the 200 response unchanged when no prerender header is present", async () => {
      const event = makeEvent("200", {
        "content-type": [{ key: "Content-Type", value: "text/html" }],
      })
      const result = await handler(event)
      expect(result.status).toBe("200")
      expect(result.headers["Cache-Control"]).toBeUndefined()
    })

    it("does not call the error page URL for a 200 response", async () => {
      const event = makeEvent("200")
      await handler(event)
      expect(mockGet).not.toHaveBeenCalled()
    })
  })
})
