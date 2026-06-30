.PHONY: build serve

# The REST API docs page uses neoteroi's [OAD(...)] directive to fetch
# the OpenAPI spec at build time from https://api.tributary.so/openapi.yaml.
# If the API server is not reachable (e.g. local dev before deployment),
# the build will fail on that page. To build locally:
#   1. Start the API server: cd apps/api && pnpm dev
#   2. Temporarily point rest-api.md at http://localhost:<port>/openapi.yaml
#   3. make build

build:
	mkdocs build

serve:
	mkdocs serve
