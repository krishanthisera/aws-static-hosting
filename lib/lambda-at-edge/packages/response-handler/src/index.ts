/**
 * Lambda function to process CloudFront Origin response events.
 * It sets cache-control headers and provides custom error pages for failed user requests.
 *
 * Per-deployment config is delivered as CloudFront origin custom headers (Lambda@Edge
 * has no runtime environment variables):
 *   x-edge-cfg-cache-key       header that marks a prerender response  (default x-prerender-requestid)
 *   x-edge-cfg-cache-max-age   max-age applied to prerender responses  (default 10)
 *   x-edge-cfg-error-page      URL of the custom error page            (default https://blog.bizkt.com.au/404.html)
 */

// Import necessary modules and types
import "source-map-support/register"
import { CloudFrontRequest, CloudFrontResponseEvent, CloudFrontResponse } from "aws-lambda"
import axios from "axios"
import * as https from "https"

const CFG_CACHE_KEY = "x-edge-cfg-cache-key"
const CFG_CACHE_MAX_AGE = "x-edge-cfg-cache-max-age"
const CFG_ERROR_PAGE = "x-edge-cfg-error-page"

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

// Create an Axios client instance for HTTP requests.
// This instance is defined outside the Lambda function for reuse between calls.
const instance = axios.create({
  timeout: 1000, // Set request timeout
  maxRedirects: 0, // Disable following redirects
  validateStatus: (status) => status === 200, // Only consider HTTP 200 as a valid response
  httpsAgent: new https.Agent({ keepAlive: true }), // Use a keep-alive HTTPS agent
})

export const handler = async (event: CloudFrontResponseEvent): Promise<CloudFrontResponse> => {
  const request = event.Records[0].cf.request
  const response = event.Records[0].cf.response

  const cacheKey = readConfig(request, CFG_CACHE_KEY, "x-prerender-requestid")
  const cacheMaxAge = readConfig(request, CFG_CACHE_MAX_AGE, "10")
  const errorPageUrl = readConfig(request, CFG_ERROR_PAGE, "https://blog.bizkt.com.au/404.html")

  // If the x-prerender-requestid header is present, set cache-control headers.
  if (response.headers[`${cacheKey}`]) {
    response.headers["Cache-Control"] = [
      {
        key: "Cache-Control",
        value: `max-age=${cacheMaxAge}`,
      },
    ]
  }
  // If the response status isn't 200 (OK), fetch and set a custom error page.
  else if (response.status !== "200") {
    try {
      const res = await instance.get(errorPageUrl)
      response.body = res.data
      response.headers["content-type"] = [
        {
          key: "Content-Type",
          value: "text/html",
        },
      ]
      // Remove any pre-existing content-length headers as they might contain values from the origin.
      delete response.headers["content-length"]
    } catch (error) {
      // If fetching the custom error page fails, return the original response.
      return response
    }
  }
  return response
}
