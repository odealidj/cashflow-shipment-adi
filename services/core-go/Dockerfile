# Multi-stage Dockerfile for Core Go API Service
FROM golang:alpine AS builder

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/core cmd/api/main.go

# Production minimal image
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Asia/Jakarta

WORKDIR /app

COPY --from=builder /app/core .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8081

CMD ["/app/core"]
