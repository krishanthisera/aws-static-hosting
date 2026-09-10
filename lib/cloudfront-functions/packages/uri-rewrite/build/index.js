// src/index.ts
function handler(event) {
  const request = event.request;
  const uri = request.uri;
  if (uri.endsWith("/")) {
    request.uri += "index.html";
  } else if (!uri.includes(".")) {
    request.uri += "/index.html";
  } else {
    const lastSegment = uri.split("/").pop();
    if (lastSegment && !lastSegment.includes(".")) {
      request.uri += "/index.html";
    }
  }
  return request;
}