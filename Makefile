.DEFAULT_GOAL := help

# Edge-function workspaces (TypeScript source; built + published to GitHub Packages by CI)
LAMBDA_DIR := lib/lambda-at-edge
CF_DIR     := lib/cloudfront-functions

##@ General

.PHONY: help
help: ## Display this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Dependencies

.PHONY: install
install: ## Install all dependencies (Lambda@Edge + CloudFront Functions)
	@echo "Installing Lambda@Edge dependencies..."
	cd $(LAMBDA_DIR) && yarn install
	@echo "Installing CloudFront Functions dependencies..."
	cd $(CF_DIR) && yarn install
	@echo "✓ Dependencies installation complete"

##@ Tests

.PHONY: test
test: ## Run all tests (Lambda@Edge + CloudFront Functions)
	@echo "Running Lambda@Edge tests..."
	cd $(LAMBDA_DIR) && yarn test
	@echo "Running CloudFront Function tests..."
	cd $(CF_DIR) && yarn test
	@echo "✓ Tests complete"

.PHONY: test-lambda
test-lambda: ## Run all Lambda@Edge tests
	cd $(LAMBDA_DIR) && yarn test

.PHONY: test-cloudfront
test-cloudfront: ## Run all CloudFront Function tests
	cd $(CF_DIR) && yarn test

.PHONY: test-filter-function
test-filter-function: ## Run tests for filter-function (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn workspace @krishanthisera/filter-function test

.PHONY: test-geo-redirect
test-geo-redirect: ## Run tests for geo-redirect (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn workspace @krishanthisera/geo-redirect test

.PHONY: test-prerender-proxy
test-prerender-proxy: ## Run tests for prerender-proxy (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn workspace @krishanthisera/prerender-proxy test

.PHONY: test-response-handler
test-response-handler: ## Run tests for response-handler (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn workspace @krishanthisera/response-handler test

.PHONY: test-uri-rewrite
test-uri-rewrite: ## Run tests for uri-rewrite (CloudFront Function)
	cd $(CF_DIR) && yarn workspace @krishanthisera/uri-rewrite test

##@ Build

.PHONY: build
build: ## Build all functions (Lambda@Edge + CloudFront Functions)
	@echo "Building Lambda@Edge functions..."
	cd $(LAMBDA_DIR) && yarn build
	@echo "Building CloudFront Functions..."
	cd $(CF_DIR) && yarn build
	@echo "✓ Build complete"

.PHONY: build-lambda
build-lambda: ## Build all Lambda@Edge functions
	cd $(LAMBDA_DIR) && yarn build

.PHONY: build-cloudfront
build-cloudfront: ## Build all CloudFront Functions
	cd $(CF_DIR) && yarn build

.PHONY: build-filter-function
build-filter-function: ## Build filter-function (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn workspace @krishanthisera/filter-function build

.PHONY: build-geo-redirect
build-geo-redirect: ## Build geo-redirect (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn workspace @krishanthisera/geo-redirect build

.PHONY: build-prerender-proxy
build-prerender-proxy: ## Build prerender-proxy (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn workspace @krishanthisera/prerender-proxy build

.PHONY: build-response-handler
build-response-handler: ## Build response-handler (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn workspace @krishanthisera/response-handler build

.PHONY: build-uri-rewrite
build-uri-rewrite: ## Build uri-rewrite (CloudFront Function)
	cd $(CF_DIR) && yarn workspace @krishanthisera/uri-rewrite build

##@ Lint

.PHONY: lint
lint: ## Run linters (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn lint:check

.PHONY: lint-fix
lint-fix: ## Run linters and fix issues (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn lint:fix

##@ Format

.PHONY: format
format: ## Check code formatting (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn format:check

.PHONY: format-fix
format-fix: ## Fix code formatting (Lambda@Edge)
	cd $(LAMBDA_DIR) && yarn format:fix

##@ Release

# Function code is published to the GitHub Packages npm registry (@krishanthisera/*)
# by the release-* GitHub Actions workflows on push to main, driven by
# Conventional Commits. These targets only preview what would be released.

.PHONY: release-dry-run-lambda
release-dry-run-lambda: ## Dry-run semantic-release for every Lambda@Edge package (needs GITHUB_TOKEN)
	@for pkg in filter-function prerender-proxy geo-redirect response-handler; do \
		echo "== $$pkg =="; \
		cd $(LAMBDA_DIR)/packages/$$pkg && npx --no-install semantic-release --dry-run --no-ci; cd - >/dev/null; \
	done

.PHONY: release-dry-run-cloudfront
release-dry-run-cloudfront: ## Dry-run semantic-release for uri-rewrite (needs GITHUB_TOKEN)
	cd $(CF_DIR)/packages/uri-rewrite && npx --no-install semantic-release --dry-run --no-ci

##@ Terraform

.PHONY: tf-init
tf-init: ## Initialize Terraform
	terraform init

.PHONY: tf-plan
tf-plan: ## Run Terraform plan
	terraform plan

.PHONY: tf-apply
tf-apply: ## Apply Terraform changes
	terraform apply

.PHONY: tf-docs
tf-docs: ## Regenerate Terraform documentation (requires terraform-docs)
	terraform-docs markdown table --output-file README.md --output-mode inject .
	terraform-docs markdown table --output-file modules/edge-functions/README.md --output-mode inject modules/edge-functions

##@ Development

.PHONY: dev
dev: install build test ## Full development setup (install, build, test)
	@echo "✓ Development environment ready"

.PHONY: watch-lambda
watch-lambda: ## Watch Lambda@Edge tests
	cd $(LAMBDA_DIR) && yarn test --watch

.PHONY: watch-cloudfront
watch-cloudfront: ## Watch CloudFront Function tests
	cd $(CF_DIR) && yarn workspace @krishanthisera/uri-rewrite test:watch

##@ Deployment

.PHONY: pre-deploy
pre-deploy: build test ## Build and test before deployment
	@echo "✓ Pre-deployment checks passed"

.PHONY: deploy
deploy: pre-deploy tf-apply ## Full deployment (build, test, apply)
	@echo "✓ Deployment complete"

##@ Clean

.PHONY: clean
clean: ## Clean build artifacts
	@echo "Cleaning Lambda@Edge build artifacts..."
	cd $(LAMBDA_DIR) && rm -rf packages/*/build function_archives .turbo packages/*/.turbo
	@echo "Cleaning CloudFront Functions build artifacts..."
	cd $(CF_DIR) && rm -rf packages/*/build .turbo packages/*/.turbo
	@echo "✓ Build artifacts cleaned"

.PHONY: clean-all
clean-all: clean ## Clean everything including node_modules
	@echo "Removing node_modules..."
	rm -rf $(LAMBDA_DIR)/node_modules $(LAMBDA_DIR)/packages/*/node_modules
	rm -rf $(CF_DIR)/node_modules $(CF_DIR)/packages/*/node_modules
	@echo "✓ Everything cleaned"
