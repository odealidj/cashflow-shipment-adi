.PHONY: help infra-up infra-down infra-logs run-local-core-go run-local-web-next generate-ui-assets

# Default command
help:
	@echo "Available commands:"
	@echo "  make infra-up            - Start infrastructure containers (PostgreSQL, etc.)"
	@echo "  make infra-down          - Stop infrastructure containers"
	@echo "  make infra-logs          - View infrastructure container logs"
	@echo "  make run-local-core-go   - Run Golang Core API service locally (http://localhost:8080)"
	@echo "  make run-local-web-next  - Run Next.js App locally (Desktop /dashboard & Mobile PWA /m on http://localhost:3000)"
	@echo "  make generate-ui-assets  - Generate stitched full-page composite assets for mobile UI docs"

# Infrastructure
infra-up:
	docker-compose up -d

infra-down:
	docker-compose down

infra-logs:
	docker-compose logs -f

# Local Services Execution
run-local-core-go:
	@echo "Starting Core Go API service on http://localhost:8080..."
	cd services/core-go && go run cmd/api/main.go

run-local-web-next:
	@echo "Starting Next.js Web & Mobile PWA on http://localhost:3000..."
	@echo "  -> Desktop:    http://localhost:3000/dashboard"
	@echo "  -> Mobile PWA: http://localhost:3000/m"
	cd apps/web-next && npm run dev

# Utility Scripts
generate-ui-assets:
	@echo "Generating mobile UI composite screenshots..."
	python3 scripts/generate_mobile_ui_assets.py
