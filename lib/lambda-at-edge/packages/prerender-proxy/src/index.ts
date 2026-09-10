/**
 * This module contains a Lambda function that processes CloudFront Origin requests.
 * Depending on the headers and conditions, it might set the request to be prerendered.
 *
 * Per-deployment config is delivered as CloudFront origin custom headers (Lambda@Edge
 * has no runtime environment variables):
 *   x-edge-cfg-prerender-token   prerender.io token           (required for prerender)
 *   x-edge-cfg-prerender-url     prerender service host       (default service.prerender.io)
 *   x-edge-cfg-path-prefix       path prefix for the homepage (default "")
 */

// Importing required modules and types
import "source-map-support/register"
import { CloudFrontRequest, CloudFrontRequestEvent, CloudFrontResponse } from "aws-lambda"

const CFG_PRERENDER_TOKEN = "x-edge-cfg-prerender-token"
const CFG_PRERENDER_URL = "x-edge-cfg-prerender-url"
const CFG_PATH_PREFIX = "x-edge-cfg-path-prefix"

/** Read a config value delivered as a CloudFront origin custom header. */
function readConfig(request: CloudFrontRequest, name: string, fallback = ""): string {
  const sources = [request.origin?.s3?.customHeaders, request.origin?.custom?.customHeaders, request.headers]
  for (const source of sources) {
    const entry = source?.[name]
    if (entry && entry[0]?.value != null) {
      return entry[0].value
    }
  }
  return fallback
}

export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontResponse | CloudFrontRequest> => {
  const request = event.Records[0].cf.request

  const prerenderToken = readConfig(request, CFG_PRERENDER_TOKEN)
  const pathPrefix = readConfig(request, CFG_PATH_PREFIX)
  const prerenderUrl = readConfig(request, CFG_PRERENDER_URL, "service.prerender.io")

  // The token is sensitive: once read, never let it continue downstream as a
  // plain request header (e.g. a client-supplied one).
  delete request.headers[CFG_PRERENDER_TOKEN]

  // If the request has the x-request-prerender header, it means the viewer-request function determined it should be prerendered
  if (request.headers["x-request-prerender"]) {
    // CloudFront alters requests for the root path to the default root object, /index.html.
    // However, when prerendering the homepage, this behavior is not desired.
    if (request.uri === `${pathPrefix}/index.html`) {
      request.uri = `${pathPrefix}/`
    }

    // Modify the request's origin to be the prerender service
    request.origin = {
      custom: {
        domainName: prerenderUrl,
        port: 443,
        protocol: "https",
        readTimeout: 60,
        keepaliveTimeout: 5,
        sslProtocols: ["TLSv1", "TLSv1.1", "TLSv1.2"],
        path: "/https%3A%2F%2F" + request.headers["x-prerender-host"][0].value,
        customHeaders: {
          "x-prerender-token": [
            {
              key: "x-prerender-token",
              value: prerenderToken,
            },
          ],
        },
      },
    }
  } else {
    // Pass-through to the real origin. Drop the prerender token config header so it
    // is not forwarded to the (S3) origin.
    delete request.origin?.s3?.customHeaders?.[CFG_PRERENDER_TOKEN]
    delete request.origin?.custom?.customHeaders?.[CFG_PRERENDER_TOKEN]

    if (request.uri.endsWith("/")) {
      request.uri += "index.html"
    } else if (!request.uri.includes(".")) {
      request.uri += "/index.html"
    }
  }

  return request
}
