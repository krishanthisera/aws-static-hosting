/**
 * This module contains a Lambda function that processes CloudFront Origin requests.
 * Depending on the headers and conditions, it might set the request to be GeoIP redirected or not.
 *
 * Per-deployment config is delivered as CloudFront origin custom headers (Lambda@Edge
 * has no runtime environment variables):
 *   x-edge-cfg-redirect-host       host to redirect to
 *   x-edge-cfg-supported-regions   regex of supported country codes (e.g. AU|NZ|US)
 *   x-edge-cfg-default-region      fallback region for unsupported countries
 */
import "source-map-support/register"

// Importing necessary types from the 'aws-lambda' library. These types define the structure
// of CloudFront request and response objects.
import { CloudFrontRequestEvent, CloudFrontResponse, CloudFrontRequest } from "aws-lambda"

const CFG_REDIRECT_HOST = "x-edge-cfg-redirect-host"
const CFG_SUPPORTED_REGIONS = "x-edge-cfg-supported-regions"
const CFG_DEFAULT_REGION = "x-edge-cfg-default-region"

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

// The main Lambda function handler.
export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontResponse | CloudFrontRequest> => {
  // Extracting the request object from the incoming event.
  const request = event.Records[0].cf.request

  const redirectHost = readConfig(request, CFG_REDIRECT_HOST)
  // "$^" never matches, so with no config nothing is treated as a supported region.
  const supportedRegions = new RegExp(readConfig(request, CFG_SUPPORTED_REGIONS, "$^"))
  const defaultRegion = readConfig(request, CFG_DEFAULT_REGION)

  // Initialize the base URL for redirection.
  const redirectURL = new URL(`https://${redirectHost}/`)

  // Check if 'cloudfront-viewer-country' header is present and the request is not a prerender request or a crawler.
  if (
    request.headers["cloudfront-viewer-country"] &&
    !request.headers["x-prerender"] &&
    !request.headers["x-request-prerender"]
  ) {
    // Extract the user's country code from the header.
    const countryCode = request.headers["cloudfront-viewer-country"][0].value

    // Determine the appropriate path for redirection based on the country code.
    if (supportedRegions.test(countryCode)) {
      redirectURL.pathname = `/${countryCode.toLowerCase()}${request.uri}`
    } else {
      // Use the default region's path if the country code is not in the supported list.
      redirectURL.pathname = `/${defaultRegion.toLowerCase()}${request.uri}`
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
