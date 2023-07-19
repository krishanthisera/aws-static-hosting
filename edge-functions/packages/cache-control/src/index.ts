/**
 * This function set the cache-control header
 * if the x-prerender-requestid header is present
 * This function is a copied from https://github.com/aligent/cdk-constructs/blob/main/packages/lambda-at-edge-handlers/lib/cache-control.ts
 */

import "source-map-support/register"
import { CloudFrontResponseEvent, CloudFrontResponse } from "aws-lambda"

export const handler = async (event: CloudFrontResponseEvent): Promise<CloudFrontResponse> => {
  const cacheKey = process.env.PRERENDER_CACHE_KEY || "x-prerender-requestid"
  const cacheMaxAge = process.env.PRERENDER_CACHE_MAX_AGE || "0"
  const response = event.Records[0].cf.response

  if (response.headers[`${cacheKey}`]) {
    response.headers["Cache-Control"] = [
      {
        key: "Cache-Control",
        value: `max-age=${cacheMaxAge}`,
      },
    ]
  }
  return response
}
