package response

import (
	"encoding/json"
	"log"
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

// CleanErrorMessage maps raw internal database/driver errors into clean, human-friendly business messages
func CleanErrorMessage(err error) string {
	if err == nil {
		return ""
	}
	msg := err.Error()
	lower := strings.ToLower(msg)

	// 1. PostgreSQL Unique Constraints (Code 23505)
	if strings.Contains(lower, "invoices_invoice_no") || strings.Contains(lower, "idx_invoices_invoice_no") {
		return "Nomor invoice sudah terdaftar di sistem. Silakan gunakan nomor invoice berbeda."
	}
	if strings.Contains(lower, "users_email") || strings.Contains(lower, "idx_users_email") {
		return "Alamat email sudah terdaftar di sistem. Silakan gunakan email lain."
	}
	if strings.Contains(lower, "users_phone") || strings.Contains(lower, "idx_users_phone") {
		return "Nomor telepon sudah terdaftar di sistem."
	}
	if strings.Contains(lower, "customers_name") || strings.Contains(lower, "idx_customers_name") {
		return "Customer dengan nama ini sudah terdaftar di sistem."
	}
	if strings.Contains(lower, "vendors_name") || strings.Contains(lower, "idx_vendors_name") {
		return "Vendor dengan nama ini sudah terdaftar di sistem."
	}
	if strings.Contains(lower, "roles_code") || strings.Contains(lower, "idx_roles_code") {
		return "Kode peran (role) sudah digunakan, silakan gunakan kode lain."
	}

	// 2. Generic duplicate key fallback
	if IsDuplicateKeyError(err) {
		return "Data yang Anda masukkan sudah terdaftar di sistem (duplikasi). Silakan gunakan data berbeda."
	}

	// 3. PostgreSQL Foreign Key Constraints (Code 23503)
	if strings.Contains(lower, "foreign key constraint") || strings.Contains(lower, "23503") {
		return "Data referensi tidak valid atau data ini masih digunakan oleh transaksi lain."
	}

	// 4. Strip raw driver prefix like "pq: " if present
	if strings.HasPrefix(msg, "pq: ") {
		return "Terjadi kendala saat memproses data ke database. Silakan periksa format input Anda."
	}

	return msg
}

// HandleError is the centralized Go error responder (analogous to Global Exception Handling in .NET)
// It logs the technical error on the server, automatically maps duplicate keys to HTTP 409,
// sanitizes raw driver/database errors, and responds with a human-friendly message.
func HandleError(w http.ResponseWriter, err error, defaultStatusCode ...int) {
	if err == nil {
		return
	}

	// Always log raw error on server console for internal tracking/debugging
	log.Printf("[API Error Handled] %v", err)

	cleanMsg := CleanErrorMessage(err)

	if IsDuplicateKeyError(err) {
		Conflict(w, cleanMsg)
		return
	}

	statusCode := http.StatusBadRequest
	if len(defaultStatusCode) > 0 {
		statusCode = defaultStatusCode[0]
	}

	Error(w, statusCode, cleanMsg)
}
