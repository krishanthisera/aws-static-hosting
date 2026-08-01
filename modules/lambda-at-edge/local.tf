locals {
  edge_functions = [
    {
      name    = "prerender-proxy"
      path    = "${var.edge_function_path}/packages/prerender-proxy/build/index.js"
      handler = "index.handler"
    },
    {
      name    = "filter-function"
      path    = "${var.edge_function_path}/packages/filter-function/build/index.js"
      handler = "index.handler"
    },
    {
      name    = "response-handler"
      path    = "${var.edge_function_path}/packages/response-handler/build/index.js"
      handler = "index.handler"
    }
  ]
}