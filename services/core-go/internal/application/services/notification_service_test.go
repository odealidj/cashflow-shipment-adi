package services_test

import (
	"context"
	"testing"

	"github.com/cashflow-shipment-app/backend/internal/application/services"
	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/google/uuid"
)

type mockNotificationRepo struct {
	items []domain.Notification
}

func (m *mockNotificationRepo) Create(ctx context.Context, n *domain.Notification) error {
	m.items = append(m.items, *n)
	return nil
}

func (m *mockNotificationRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Notification, error) {
	for _, it := range m.items {
		if it.ID == id {
			return &it, nil
		}
	}
	return nil, nil
}

func (m *mockNotificationRepo) ListByUserOrRole(ctx context.Context, userID *uuid.UUID, role string, offset, limit int, filter ports.NotificationFilter) ([]domain.Notification, int, error) {
	return m.items, len(m.items), nil
}

func (m *mockNotificationRepo) GetUnreadCount(ctx context.Context, userID *uuid.UUID, role string) (int, error) {
	count := 0
	for _, it := range m.items {
		if !it.IsRead {
			count++
		}
	}
	return count, nil
}

func (m *mockNotificationRepo) MarkAsRead(ctx context.Context, id uuid.UUID, userID *uuid.UUID) error {
	for i := range m.items {
		if m.items[i].ID == id {
			m.items[i].IsRead = true
			return nil
		}
	}
	return nil
}

func (m *mockNotificationRepo) MarkAllAsRead(ctx context.Context, userID *uuid.UUID, role string) error {
	for i := range m.items {
		m.items[i].IsRead = true
	}
	return nil
}

func (m *mockNotificationRepo) Delete(ctx context.Context, id uuid.UUID) error {
	for i, it := range m.items {
		if it.ID == id {
			m.items = append(m.items[:i], m.items[i+1:]...)
			return nil
		}
	}
	return nil
}

func (m *mockNotificationRepo) DeleteOlderThan(ctx context.Context, days int) (int64, error) {
	return 0, nil
}

func TestFormatRupiah(t *testing.T) {
	cases := []struct {
		input    float64
		expected string
	}{
		{15000000, "15.000.000"},
		{8200500, "8.200.500"},
		{500, "500"},
		{1000, "1.000"},
		{0, "0"},
		{-2500000, "-2.500.000"},
	}

	for _, c := range cases {
		res := services.FormatRupiah(c.input)
		if res != c.expected {
			t.Errorf("FormatRupiah(%f) = %s, expected %s", c.input, res, c.expected)
		}
	}
}

func TestNotificationService_CRUD(t *testing.T) {
	repo := &mockNotificationRepo{}
	svc := services.NewNotificationService(repo)
	ctx := context.Background()

	targetRole := "finance"
	notif, err := svc.Create(ctx, services.CreateNotificationInput{
		TargetRole: &targetRole,
		Title:      "Test Notification",
		Message:    "Testing notification message",
		Category:   domain.NotificationCategoryInvoice,
		Severity:   domain.NotificationSeverityWarning,
	})
	if err != nil {
		t.Fatalf("Create notification failed: %v", err)
	}

	count, err := svc.GetUnreadCount(ctx, nil, "finance")
	if err != nil || count != 1 {
		t.Fatalf("expected count 1, got %d (err: %v)", count, err)
	}

	err = svc.MarkAsRead(ctx, notif.ID, nil)
	if err != nil {
		t.Fatalf("MarkAsRead failed: %v", err)
	}

	countAfter, _ := svc.GetUnreadCount(ctx, nil, "finance")
	if countAfter != 0 {
		t.Fatalf("expected count 0 after mark read, got %d", countAfter)
	}
}
