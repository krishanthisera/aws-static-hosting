/**
 * This module contains a Lambda function that processes CloudFront Origin requests.
 * Depending on the headers and conditions, it might set the request to be prerendered.
 */

// Importing required modules and types
import "source-map-support/register"
import { CloudFrontRequest, CloudFrontRequestEvent, CloudFrontResponse } from "aws-lambda"

// Retrieving environment variables for prerender configurations
const PRERENDER_TOKEN = process.env.PRERENDER_TOKEN || ""
const PATH_PREFIX = process.env.PATH_PREFIX || ""
const PRERENDER_URL = process.env.PRERENDER_URL || "service.prerender.io"

export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontResponse | CloudFrontRequest> => {
  const request = event.Records[0].cf.request

  // If the request has the x-request-prerender header, it means the viewer-request function determined it should be prerendered
  if (request.headers["x-request-prerender"]) {
    // CloudFront alters requests for the root path to the default root object, /index.html.
    // However, when prerendering the homepage, this behavior is not desired.
    if (request.uri === `${PATH_PREFIX}/index.html`) {
      request.uri = `${PATH_PREFIX}/`
    }

    // Modify the request's origin to be the prerender service
    request.origin = {
      custom: {
        domainName: PRERENDER_URL,
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
              value: PRERENDER_TOKEN,
            },
          ],
        },
      },
    }
  } else {
    if (request.uri.endsWith("/")) {
      request.uri += "index.html"
    } else if (!request.uri.includes(".")) {
      request.uri += "/index.html"
    }
  }

  return request
}
