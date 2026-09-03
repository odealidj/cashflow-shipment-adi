package handler

import (
	"net/http"

	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/google/uuid"
)

type UtilityHandler struct{}

func NewUtilityHandler() *UtilityHandler {
	return &UtilityHandler{}
}

// IdempotencyKeyResponse payload model for Swagger
type IdempotencyKeyResponse struct {
	IdempotencyKey string `json:"idempotency_key" example:"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"`
	ExpiresInHours int    `json:"expires_in_hours" example:"24"`
	UsageHint      string `json:"usage_hint" example:"Include this key in the 'X-Idempotency-Key' request header for POST/PUT/PATCH/DELETE mutations"`
}

// GenerateIdempotencyKey godoc
// @Summary      Generate fresh Idempotency Key
// @Description  Generates a new RFC 4122 UUID v4 to be used as 'X-Idempotency-Key' header on mutation endpoints (POST/PUT/PATCH/DELETE).
// @Tags         utility
// @Produce      json
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Success      200 {object} response.APIResponse{data=handler.IdempotencyKeyResponse}
// @Router       /utility/idempotency-key [get]
func (h *UtilityHandler) GenerateIdempotencyKey(w http.ResponseWriter, r *http.Request) {
	newUUID := uuid.New().String()
	res := IdempotencyKeyResponse{
		IdempotencyKey: newUUID,
		ExpiresInHours: 24,
		UsageHint:      "Sertakan key ini pada header 'X-Idempotency-Key' untuk request mutasi (POST, PUT, PATCH, DELETE) guna mencegah duplikasi.",
	}
	response.JSON(w, http.StatusOK, "Idempotency key baru berhasil digenerate", res)
}
