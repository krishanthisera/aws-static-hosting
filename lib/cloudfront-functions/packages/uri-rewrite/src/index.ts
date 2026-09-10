/**
 * CloudFront Function to rewrite URIs to append index.html for directory requests
 * This function runs at the viewer request stage
 */

interface CloudFrontRequest {
  uri: string;
  method: string;
  querystring: string;
  headers: Record<string, Array<{ key: string; value: string }>>;
}

interface CloudFrontEvent {
  request: CloudFrontRequest;
}

export function handler(event: CloudFrontEvent): CloudFrontRequest {
  const request = event.request;
  const uri = request.uri;

  // Check if the URI ends with a slash
  if (uri.endsWith("/")) {
    request.uri += "index.html";
  }
  // Check if the URI has no file extension (no dot after the last slash)
  else if (!uri.includes(".")) {
    request.uri += "/index.html";
  }
  // If URI contains a dot in the last path segment, check if it's actually a file
  else {
    const lastSegment = uri.split("/").pop();
    if (lastSegment && !lastSegment.includes(".")) {
      request.uri += "/index.html";
    }
  }

  return request;
}
