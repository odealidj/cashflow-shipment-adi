.PHONY: help infra-up infra-down infra-logs run-local-core-go run-core-go run-local-api-gateway-go run-api-gateway-go run-local-all-go run-all-go run-local-web-next generate-ui-assets swagger-gen

# Default command
help:
	@echo "Available commands:"
	@echo "  --- Infrastructure (Database, Cache & Observability) ---"
	@echo "  make infra-up                - Start PostgreSQL 15, Redis 7, Prometheus & k6 containers"
	@echo "  make infra-down              - Stop infrastructure containers"
	@echo "  make infra-logs              - View infrastructure container logs"
	@echo ""
	@echo "  --- Go Backend Services Orchestration ---"
	@echo "  make run-local-core-go       - Run Core Go API locally on host (http://localhost:8080)"
	@echo "  make run-core-go             - Run Core Go API in container (http://localhost:8081)"
	@echo "  make run-local-api-gateway-go- Run API Gateway locally on host (http://localhost:8080)"
	@echo "  make run-api-gateway-go      - Run API Gateway in container (http://localhost:8080)"
	@echo "  make run-local-all-go        - Run all Go services on host (Core :8081 + Gateway :8080)"
	@echo "  make run-all-go              - Run all services in Docker containers"
	@echo ""
	@echo "  --- Frontend & Utilities ---"
	@echo "  make run-local-web-next      - Run Next.js App locally (http://localhost:3000)"
	@echo "  make swagger-gen             - Generate Swagger OpenAPI documentation"
	@echo "  make generate-ui-assets      - Generate stitched full-page composite assets"

# Infrastructure
infra-up:
	docker-compose up -d postgres redis prometheus k6

infra-down:
	docker-compose down

infra-logs:
	docker-compose logs -f

# 1. Run Core Go on Host (Standalone on port 8080)
run-local-core-go:
	@echo "Starting Core Go API service on host OS (http://localhost:8080)..."
	cd services/core-go && go run cmd/api/main.go

# 2. Run Core Go in Container (Port 8081)
run-core-go:
	@echo "Starting Core Go container (http://localhost:8081)..."
	docker-compose up -d --build core-go

# 3. Run API Gateway on Host (Port 8080 -> proxies to localhost:8081)
run-local-api-gateway-go:
	@echo "Starting API Gateway on host OS (http://localhost:8080)..."
	cd services/gateway-go && go run cmd/gateway/main.go

# 4. Run API Gateway in Container (Port 8080)
run-api-gateway-go:
	@echo "Starting API Gateway container (http://localhost:8080)..."
	docker-compose up -d --build gateway-go

# 5. Run All Go Services on Host (Core Go :8081 + Gateway :8080)
run-local-all-go:
	@echo "Starting all Go services on host OS..."
	@echo "  -> Core Go:     http://localhost:8081"
	@echo "  -> API Gateway: http://localhost:8080 (Public Facade)"
	@bash -c 'trap "kill 0" SIGINT SIGTERM EXIT; \
	(cd services/core-go && PORT=8081 go run cmd/api/main.go) & \
	(cd services/gateway-go && PORT=8080 CORE_SERVICE_URL=http://localhost:8081 REDIS_ADDR=localhost:6379 go run cmd/gateway/main.go) & \
	wait'

# 6. Run All Services in Container
run-all-go:
	@echo "Starting all services in Docker containers..."
	docker-compose up -d --build

# Frontend
run-local-web-next:
	@echo "Starting Next.js Web & Mobile PWA on http://localhost:3000..."
	@echo "  -> Desktop:    http://localhost:3000/dashboard"
	@echo "  -> Mobile PWA: http://localhost:3000/m"
	cd apps/web-next && npm run dev

# Utility Scripts
generate-ui-assets:
	@echo "Generating mobile UI composite screenshots..."
	python3 scripts/generate_mobile_ui_assets.py

swagger-gen:
	@echo "Generating Swagger OpenAPI documentation..."
	cd services/core-go && swag init -g cmd/api/main.go
