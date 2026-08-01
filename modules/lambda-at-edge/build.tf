resource "null_resource" "check_node_version" {

  triggers = {
    package_json = filesha256("${path.module}/${var.edge_function_path}/package.json")
  }

  provisioner "local-exec" {
    command     = "npx yarn version  --non-interactive"
    working_dir = "${path.module}/${var.edge_function_path}"

    interpreter = ["bash", "-c"]

    on_failure = fail
  }
}

// TODO: Remove this resource once the build is handled in CI.
// It is intended as a convenience for local development only.
// For production deployments, the build step should be performed in CI before running
// Terraform, and this resource should be removed in favour of pre-built artefacts.
resource "null_resource" "build_edge_functions" {

  triggers = {
    source_hash = sha1(join("", [
      for f in sort(fileset("${path.module}/${var.edge_function_path}/packages", "*/src/*.ts")) :
      filesha256("${path.module}/${var.edge_function_path}/packages/${f}")
    ]))
    outputs_present = alltrue([
      for fn in local.edge_functions : fileexists("${path.module}/${fn.path}")
    ]) ? "yes" : "no"
  }

  provisioner "local-exec" {
    command     = "npx yarn install  --non-interactive && npx yarn build"
    working_dir = "${path.module}/${var.edge_function_path}"

    interpreter = ["bash", "-c"]

    on_failure = fail
  }

  depends_on = [null_resource.check_node_version]

}

