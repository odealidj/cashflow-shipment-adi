package response

import (
	"encoding/json"
	"net/http"
	"strings"
)

// PaginationMeta holds standardized pagination metadata
type PaginationMeta struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	TotalItems int  `json:"total_items"`
	TotalPages int  `json:"total_pages"`
	HasNext    bool `json:"has_next"`
	HasPrev    bool `json:"has_prev"`
}

// APIResponse is the unified top-level JSON response envelope across the entire application
type APIResponse struct {
	Status  bool            `json:"status"`
	Message string          `json:"message"`
	Data    interface{}     `json:"data,omitempty"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
	Errors  interface{}     `json:"errors,omitempty"`
}

// JSON sends a standard JSON response for single objects, non-paginated lists, or action results
func JSON(w http.ResponseWriter, statusCode int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	json.NewEncoder(w).Encode(APIResponse{
		Status:  statusCode >= 200 && statusCode < 300,
		Message: message,
		Data:    data,
	})
}

// Paginated sends a standard JSON response for paginated collections
// The primary items slice is passed directly to Data, and metadata is populated at root level
func Paginated(w http.ResponseWriter, statusCode int, message string, items interface{}, page, limit, total int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	totalPages := 0
	if limit > 0 {
		totalPages = (total + limit - 1) / limit
	}

	meta := &PaginationMeta{
		Page:       page,
		Limit:      limit,
		TotalItems: total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1 && totalPages > 0,
	}

	json.NewEncoder(w).Encode(APIResponse{
		Status:  statusCode >= 200 && statusCode < 300,
		Message: message,
		Data:    items,
		Meta:    meta,
	})
}

// Error sends a standard error response
func Error(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	json.NewEncoder(w).Encode(APIResponse{
		Status:  false,
		Message: message,
		Data:    nil,
	})
}

// Conflict sends an HTTP 409 Conflict response for duplicate key collisions (e.g., unique constraints)
func Conflict(w http.ResponseWriter, message string) {
	Error(w, http.StatusConflict, message)
}

// ErrorWithDetails sends an error response with additional validation or error details
func ErrorWithDetails(w http.ResponseWriter, statusCode int, message string, details interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	json.NewEncoder(w).Encode(APIResponse{
		Status:  false,
		Message: message,
		Data:    nil,
		Errors:  details,
	})
}

// IsDuplicateKeyError detects whether an error is caused by a unique constraint / duplicate key collision
func IsDuplicateKeyError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "already exists") ||
		strings.Contains(msg, "sudah terdaftar") ||
		strings.Contains(msg, "sudah digunakan") ||
		strings.Contains(msg, "23505")
}
