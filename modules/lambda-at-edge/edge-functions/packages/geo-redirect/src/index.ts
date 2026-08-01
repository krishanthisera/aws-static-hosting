/**
 * This module contains a Lambda function that processes CloudFront Origin requests.
 * Depending on the headers and conditions, it might set the request to be GeoIP redirected or not.
 */
import "source-map-support/register"

// Importing necessary types from the 'aws-lambda' library. These types define the structure
// of CloudFront request and response objects.
import { CloudFrontRequestEvent, CloudFrontResponse, CloudFrontRequest } from "aws-lambda"

// Reading environment variables for configuration.
const REDIRECT_HOST = process.env.REDIRECT_HOST // Host to which users will be redirected.
const SUPPORTED_REGIONS = new RegExp(process.env.SUPPORTED_REGIONS!) // Regex pattern matching supported country codes.
const DEFAULT_REGION = process.env.DEFAULT_REGION // Default region to redirect to if the country code is unsupported.

// The main Lambda function handler.
export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontResponse | CloudFrontRequest> => {
  // Extracting the request object from the incoming event.
  const request = event.Records[0].cf.request

  // Initialize the base URL for redirection.
  const redirectURL = new URL(`https://${REDIRECT_HOST}/`)

  // Check if 'cloudfront-viewer-country' header is present and the request is not a prerender request or a crawler.
  if (
    request.headers["cloudfront-viewer-country"] &&
    !request.headers["x-prerender"] &&
    !request.headers["x-request-prerender"]
  ) {
    // Extract the user's country code from the header.
    const countryCode = request.headers["cloudfront-viewer-country"][0].value

    // Determine the appropriate path for redirection based on the country code.
    if (SUPPORTED_REGIONS.test(countryCode)) {
      redirectURL.pathname = `/${countryCode.toLowerCase()}${request.uri}`
    } else {
      // Use the default region's path if the country code is not in the supported list.
      redirectURL.pathname = `/${DEFAULT_REGION!.toLowerCase()}${request.uri}`
    }

    // Return a 302 redirect response with the determined URL. The replace function removes trailing slashes.
    return {
      status: "302",
      statusDescription: "Found",
      headers: {
        location: [
          {
            key: "Location",
            value: redirectURL.toString().replace(/\/+$/, ""),
          },
        ],
      },
    }
  }

  // If the 'cloudfront-viewer-country' header is absent or it's a prerender request, simply return the original request.
  return request
}
