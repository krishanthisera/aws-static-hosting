import { describe, it, expect, vi } from "vitest"
import type { CloudFrontRequestEvent } from "aws-lambda"

vi.mock("source-map-support/register", () => ({}))

import { handler } from "./index"

const BOT_USER_AGENT = "Googlebot/2.1 (+http://www.google.com/bot.html)"
const HUMAN_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"

function makeEvent(
  uri: string,
  userAgent: string,
  extraHeaders: Record<string, Array<{ key: string; value: string }>> = {},
): CloudFrontRequestEvent {
  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: "test.cloudfront.net",
            distributionId: "TESTID",
            eventType: "viewer-request",
            requestId: "test-request-id",
          },
          request: {
            clientIp: "1.2.3.4",
            method: "GET",
            uri,
            querystring: "",
            headers: {
              host: [{ key: "Host", value: "example.com" }],
              "user-agent": [{ key: "User-Agent", value: userAgent }],
              ...extraHeaders,
            },
          },
        },
      },
    ],
  }
}

describe("filter-function handler", () => {
  describe("bot detection", () => {
    it("sets x-request-prerender header for googlebot on a non-file URI", async () => {
      const event = makeEvent("/some-page", BOT_USER_AGENT)
      const result = await handler(event)
      expect(result.headers["x-request-prerender"]).toBeDefined()
      expect(result.headers["x-request-prerender"][0].value).toBe("true")
    })

    it("sets x-prerender-host header to the request host for a bot", async () => {
      const event = makeEvent("/some-page", BOT_USER_AGENT)
      const result = await handler(event)
      expect(result.headers["x-prerender-host"]).toBeDefined()
      expect(result.headers["x-prerender-host"][0].value).toBe("example.com")
    })

    it.each(["bingbot/2.0", "Twitterbot/1.0", "LinkedInBot/1.0", "facebookexternalhit/1.1", "Slackbot-LinkExpanding"])(
      "sets x-request-prerender for known bot: %s",
      async (ua) => {
        const event = makeEvent("/page", ua)
        const result = await handler(event)
        expect(result.headers["x-request-prerender"]).toBeDefined()
      },
    )

    it("does not set x-request-prerender for a regular browser user agent", async () => {
      const event = makeEvent("/some-page", HUMAN_USER_AGENT)
      const result = await handler(event)
      expect(result.headers["x-request-prerender"]).toBeUndefined()
    })
  })

  describe("file extension detection", () => {
    it.each([
      "/bundle.js",
      "/styles.css",
      "/image.png",
      "/photo.jpg",
      "/photo.jpeg",
      "/logo.svg",
      "/font.woff",
      "/icon.ico",
      "/document.pdf",
    ])("does not set x-request-prerender for file URI: %s", async (uri) => {
      const event = makeEvent(uri, BOT_USER_AGENT)
      const result = await handler(event)
      expect(result.headers["x-request-prerender"]).toBeUndefined()
    })
  })

  describe("existing prerender header", () => {
    it("does not set x-request-prerender when x-prerender header is already present", async () => {
      const event = makeEvent("/some-page", BOT_USER_AGENT, {
        "x-prerender": [{ key: "x-prerender", value: "true" }],
      })
      const result = await handler(event)
      expect(result.headers["x-request-prerender"]).toBeUndefined()
    })
  })

  describe("pass-through", () => {
    it("returns the request object unchanged for non-bot traffic", async () => {
      const event = makeEvent("/some-page", HUMAN_USER_AGENT)
      const result = await handler(event)
      expect(result).toBe(event.Records[0].cf.request)
    })
  })
})
