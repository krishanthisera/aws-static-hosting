##@ General

.DEFAULT_GOAL := help

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Dependencies

.PHONY: install
install: ## Install dependencies
	cd edge-functions && yarn install

##@ Tests

.PHONY: test
test: ## Run all tests across all packages
	cd edge-functions && yarn test

.PHONY: test-filter-function
test-filter-function: ## Run tests for the filter-function package
	cd edge-functions && yarn workspace @edge-functions/prerender-check test

.PHONY: test-geo-redirect
test-geo-redirect: ## Run tests for the geo-redirect package
	cd edge-functions && yarn workspace @edge-functions/geo-redirect test

.PHONY: test-prerender-proxy
test-prerender-proxy: ## Run tests for the prerender-proxy package
	cd edge-functions && yarn workspace @edge-functions/prerender test

.PHONY: test-response-handler
test-response-handler: ## Run tests for the response-handler package
	cd edge-functions && yarn workspace @edge-functions/cache-control test

##@ Lint

.PHONY: lint
lint: ## Run linters across all packages
	cd edge-functions && yarn lint:check

.PHONY: lint-fix
lint-fix: ## Run linters and fix issues
	cd edge-functions && yarn lint:fix

##@ Format

.PHONY: format
format: ## Check formatting across all packages
	cd edge-functions && yarn format:check

.PHONY: format-fix
format-fix: ## Fix formatting across all packages
	cd edge-functions && yarn format:fix

##@ Build

.PHONY: build
build: ## Build all packages
	cd edge-functions && yarn build

##@ Docs

.PHONY: docs
docs: ## Regenerate Terraform documentation (requires terraform-docs)
	terraform-docs markdown table --output-file README.md --output-mode inject .
