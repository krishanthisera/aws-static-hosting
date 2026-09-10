import { describe, it, expect } from "vitest";
import { handler } from "./index";

interface CloudFrontRequest {
  uri: string;
  method: string;
  querystring: string;
  headers: Record<string, Array<{ key: string; value: string }>>;
}

interface CloudFrontEvent {
  request: CloudFrontRequest;
}

function makeEvent(uri: string): CloudFrontEvent {
  return {
    request: {
      uri,
      method: "GET",
      querystring: "",
      headers: {
        host: [{ key: "Host", value: "example.com" }],
      },
    },
  };
}

describe("uri-rewrite handler", () => {
  describe("directory paths (trailing slash)", () => {
    it("appends index.html to root path", () => {
      const event = makeEvent("/");
      const result = handler(event);
      expect(result.uri).toBe("/index.html");
    });

    it("appends index.html to subdirectory with trailing slash", () => {
      const event = makeEvent("/blog/");
      const result = handler(event);
      expect(result.uri).toBe("/blog/index.html");
    });

    it("appends index.html to nested directory with trailing slash", () => {
      const event = makeEvent("/docs/guide/");
      const result = handler(event);
      expect(result.uri).toBe("/docs/guide/index.html");
    });
  });

  describe("paths without extensions", () => {
    it("appends /index.html to path without extension", () => {
      const event = makeEvent("/about");
      const result = handler(event);
      expect(result.uri).toBe("/about/index.html");
    });

    it("appends /index.html to nested path without extension", () => {
      const event = makeEvent("/blog/post-title");
      const result = handler(event);
      expect(result.uri).toBe("/blog/post-title/index.html");
    });

    it("appends /index.html to path with dashes but no extension", () => {
      const event = makeEvent("/my-awesome-page");
      const result = handler(event);
      expect(result.uri).toBe("/my-awesome-page/index.html");
    });
  });

  describe("static file paths (with extensions)", () => {
    it("does not modify HTML file request", () => {
      const event = makeEvent("/page.html");
      const result = handler(event);
      expect(result.uri).toBe("/page.html");
    });

    it("does not modify JavaScript file request", () => {
      const event = makeEvent("/assets/bundle.js");
      const result = handler(event);
      expect(result.uri).toBe("/assets/bundle.js");
    });

    it("does not modify CSS file request", () => {
      const event = makeEvent("/styles/main.css");
      const result = handler(event);
      expect(result.uri).toBe("/styles/main.css");
    });

    it("does not modify image file requests", () => {
      const cases = ["/logo.png", "/photo.jpg", "/icon.svg", "/image.webp", "/graphic.gif"];
      cases.forEach((uri) => {
        const event = makeEvent(uri);
        const result = handler(event);
        expect(result.uri).toBe(uri);
      });
    });

    it("does not modify font file requests", () => {
      const event = makeEvent("/fonts/Roboto-Regular.woff2");
      const result = handler(event);
      expect(result.uri).toBe("/fonts/Roboto-Regular.woff2");
    });

    it("does not modify JSON file requests", () => {
      const event = makeEvent("/api/data.json");
      const result = handler(event);
      expect(result.uri).toBe("/api/data.json");
    });

    it("does not modify XML file requests", () => {
      const event = makeEvent("/sitemap.xml");
      const result = handler(event);
      expect(result.uri).toBe("/sitemap.xml");
    });
  });

  describe("edge cases", () => {
    it("handles paths with query strings correctly", () => {
      const event = makeEvent("/blog");
      event.request.querystring = "page=2";
      const result = handler(event);
      expect(result.uri).toBe("/blog/index.html");
      expect(result.querystring).toBe("page=2");
    });

    it("handles paths with multiple dots in filename", () => {
      const event = makeEvent("/assets/bundle.min.js");
      const result = handler(event);
      expect(result.uri).toBe("/assets/bundle.min.js");
    });

    it("handles deeply nested paths without extensions", () => {
      const event = makeEvent("/docs/guides/getting-started");
      const result = handler(event);
      expect(result.uri).toBe("/docs/guides/getting-started/index.html");
    });

    it("handles paths with special characters", () => {
      const event = makeEvent("/blog/hello-world");
      const result = handler(event);
      expect(result.uri).toBe("/blog/hello-world/index.html");
    });

    it("preserves other request properties", () => {
      const event = makeEvent("/about");
      event.request.method = "GET";
      event.request.headers["user-agent"] = [
        { key: "User-Agent", value: "Mozilla/5.0" },
      ];

      const result = handler(event);
      expect(result.method).toBe("GET");
      expect(result.headers["user-agent"]).toBeDefined();
    });
  });
});
