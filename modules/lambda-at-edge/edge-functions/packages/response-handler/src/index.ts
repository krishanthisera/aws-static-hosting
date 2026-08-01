/**
 * Lambda function to process CloudFront Origin response events.
 * It sets cache-control headers and provides custom error pages for failed user requests.
 */

// Import necessary modules and types
import "source-map-support/register"
import { CloudFrontResponseEvent, CloudFrontResponse } from "aws-lambda"
import axios from "axios"
import * as https from "https"

// Retrieve environment variables for prerender cache configuration and error page URL
const cacheKey = process.env.PRERENDER_CACHE_KEY || "x-prerender-requestid"
const cacheMaxAge = process.env.PRERENDER_CACHE_MAX_AGE || 10
const errorPageUrl = process.env.ERROR_PAGE || "https://blog.bizkt.com.au/404.html"

// Create an Axios client instance for HTTP requests.
// This instance is defined outside the Lambda function for reuse between calls.
const instance = axios.create({
  timeout: 1000, // Set request timeout
  maxRedirects: 0, // Disable following redirects
  validateStatus: (status) => status === 200, // Only consider HTTP 200 as a valid response
  httpsAgent: new https.Agent({ keepAlive: true }), // Use a keep-alive HTTPS agent
})

export const handler = async (event: CloudFrontResponseEvent): Promise<CloudFrontResponse> => {
  const response = event.Records[0].cf.response

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
