package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/pkg/response"
	"github.com/go-chi/chi/v5"
)

type CustomerHandler struct {
	customerService *services.CustomerService
}

func NewCustomerHandler(customerService *services.CustomerService) *CustomerHandler {
	return &CustomerHandler{customerService: customerService}
}

// List Customers godoc
// @Summary      Get all customers
// @Tags         customers
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Param        page query int false "Page number" default(1)
// @Param        limit query int false "Items per page" default(50)
// @Param        search query string false "Search query"
// @Success      200  {object}  response.APIResponse
// @Router       /customers [get]
func (h *CustomerHandler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 50
	}
	search := r.URL.Query().Get("search")
	sortBy := r.URL.Query().Get("sort_by")
	sortDir := r.URL.Query().Get("sort_dir")

	customers, total, err := h.customerService.ListAllCustomers(r.Context(), page, limit, search, sortBy, sortDir)
	if err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}
	response.Paginated(w, http.StatusOK, "Customers retrieved", customers, page, limit, total)
}

// Get Customer godoc
// @Summary      Get customer by ID
// @Tags         customers
// @Produce      json
// @Security     BearerAuth
// @Param        X-API-Version header string false "API Version (default: v1)"
// @Param        id path int true "Customer ID"
// @Success      200  {object}  response.APIResponse
// @Router       /customers/{id} [get]
func (h *CustomerHandler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	customer, err := h.customerService.GetCustomerByID(r.Context(), id)
	if err != nil {
		response.Error(w, http.StatusNotFound, "Customer not found")
		return
	}

	response.JSON(w, http.StatusOK, "Customer retrieved", customer)
}

// Create Customer godoc
// @Summary      Create new customer
// @Tags         customers
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        request body domain.Customer true "Customer Data"
// @Success      201  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Failure      409  {object}  response.APIResponse
// @Router       /customers [post]
func (h *CustomerHandler) Create(w http.ResponseWriter, r *http.Request) {
	var customer domain.Customer
	if err := json.NewDecoder(r.Body).Decode(&customer); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if err := h.customerService.CreateCustomer(r.Context(), &customer); err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusCreated, "Customer created successfully", customer)
}

// Update Customer godoc
// @Summary      Update existing customer
// @Tags         customers
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id path int true "Customer ID"
// @Param        request body domain.Customer true "Customer Data"
// @Success      200  {object}  response.APIResponse
// @Failure      400  {object}  response.APIResponse
// @Failure      409  {object}  response.APIResponse
// @Router       /customers/{id} [put]
func (h *CustomerHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	var customer domain.Customer
	if err := json.NewDecoder(r.Body).Decode(&customer); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	customer.ID = id

	if err := h.customerService.UpdateCustomer(r.Context(), &customer); err != nil {
		response.HandleError(w, err)
		return
	}

	response.JSON(w, http.StatusOK, "Customer updated successfully", customer)
}

// Delete Customer godoc
// @Summary      Soft delete customer
// @Tags         customers
// @Produce      json
// @Security     BearerAuth
// @Param        X-Idempotency-Key header string false "Idempotency Key (UUID unik pencegah duplikasi transaksi)" default(a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11)
// @Param        X-API-Version     header string false "API Version (default: v1)"
// @Param        id path int true "Customer ID"
// @Success      200  {object}  response.APIResponse
// @Router       /customers/{id} [delete]
func (h *CustomerHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	if err := h.customerService.DeleteCustomer(r.Context(), id); err != nil {
		response.HandleError(w, err, http.StatusInternalServerError)
		return
	}

	response.JSON(w, http.StatusOK, "Customer deleted successfully", nil)
}
