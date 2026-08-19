.PHONY: help infra-up infra-down infra-logs run-local-core-go run-local-web-next

# Default command
help:
	@echo "Available commands:"
	@echo "  make infra-up            - Start infrastructure containers (PostgreSQL, etc.)"
	@echo "  make infra-down          - Stop infrastructure containers"
	@echo "  make infra-logs          - View infrastructure container logs"
	@echo "  make run-local-core-go   - Run Golang Core API service locally"
	@echo "  make run-local-web-next  - Run Next.js Web App locally"

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
	@echo "Starting Next.js Web App on http://localhost:3000..."
	cd apps/web-next && npm run dev
