/**
 * This module contains a Lambda function to handle CloudFront Viewer requests.
 * If the request is from a recognized bot, it sets the x-request-prerender header.
 * This informs the origin-request Lambda function to alter the origin to prerender.io.
 */

// Importing required modules and types
import "source-map-support/register"
import { CloudFrontRequest, CloudFrontRequestEvent } from "aws-lambda"

// Regular expression to identify bot user agents
const IS_BOT =
  /googlebot|Google-InspectionTool|chrome-lighthouse|lighthouse|adsbot-google|Feedfetcher-Google|bingbot|yandex|baiduspider|Facebot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkShare|W3C_Validator/i

// Regular expression to identify file extensions in the URI
const IS_FILE =
  /\.(js|css|xml|less|png|jpg|jpeg|gif|pdf|doc|txt|ico|rss|zip|mp3|rar|exe|wmv|doc|avi|ppt|mpg|mpeg|tif|wav|mov|psd|ai|xls|mp4|m4a|swf|dat|dmg|iso|flv|m4v|torrent|ttf|woff|svg|eot)$/i

export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontRequest> => {
  const request = event.Records[0].cf.request

  // Check if the request:
  // 1. Does not match any of the recognized file extensions
  // 2. Is from a recognized bot user agent
  // 3. Does not already have an x-prerender header
  if (
    !IS_FILE.test(request.uri) &&
    IS_BOT.test(request.headers["user-agent"][0].value) &&
    !request.headers["x-prerender"]
  ) {
    // Set x-request-prerender header to inform origin-request Lambda function
    request.headers["x-request-prerender"] = [
      {
        key: "x-request-prerender",
        value: "true",
      },
    ]

    // Set x-prerender-host header to the host of the request
    request.headers["x-prerender-host"] = [
      {
        key: "X-Prerender-Host",
        value: request.headers.host[0].value,
      },
    ]
  }

  return request
}
