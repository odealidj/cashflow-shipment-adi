package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/cashflow-shipment-app/backend/internal/core/ports"
	"github.com/google/uuid"
)

type l1Item struct {
	session *domain.UserSession
	expiry  time.Time
}

type SessionService struct {
	redisRepo ports.SessionRepository
	l1Cache   map[string]l1Item
	l1Mutex   sync.RWMutex
	l1TTL     time.Duration
	l2TTL     time.Duration
}

func NewSessionService(redisRepo ports.SessionRepository) *SessionService {
	s := &SessionService{
		redisRepo: redisRepo,
		l1Cache:   make(map[string]l1Item),
		l1TTL:     60 * time.Second,  // L1 In-Memory cache 60 seconds
		l2TTL:     24 * time.Hour,     // L2 Redis TTL 24 hours
	}

	// Periodic cleanup of expired L1 items
	go s.startL1Cleanup(2 * time.Minute)

	return s
}

func (s *SessionService) startL1Cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		now := time.Now()
		s.l1Mutex.Lock()
		for k, v := range s.l1Cache {
			if now.After(v.expiry) {
				delete(s.l1Cache, k)
			}
		}
		s.l1Mutex.Unlock()
	}
}

// Generate secure 32-byte opaque session token
func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return "sess_" + hex.EncodeToString(b), nil
}

// CreateSession creates an active session in L2 Redis and L1 Memory
func (s *SessionService) CreateSession(ctx context.Context, user *domain.User) (*domain.UserSession, string, error) {
	token, err := generateToken()
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate session token: %w", err)
	}

	now := time.Now()
	session := &domain.UserSession{
		SessionID: token,
		UserID:    user.ID,
		Email:     user.Email,
		Phone:     user.Phone,
		FullName:  user.FullName,
		Role:      user.Role,
		Status:    user.Status,
		CreatedAt: now,
		ExpiresAt: now.Add(s.l2TTL),
	}

	// Save to L2 Redis
	if err := s.redisRepo.SaveSession(ctx, session, s.l2TTL); err != nil {
		return nil, "", fmt.Errorf("failed to save session to Redis: %w", err)
	}

	// Save to L1 Memory
	s.l1Mutex.Lock()
	s.l1Cache[token] = l1Item{
		session: session,
		expiry:  now.Add(s.l1TTL),
	}
	s.l1Mutex.Unlock()

	return session, token, nil
}

// GetSession retrieves session with L1-first strategy (< 0.005ms) fallback to L2 Redis
func (s *SessionService) GetSession(ctx context.Context, sessionID string) (*domain.UserSession, error) {
	if sessionID == "" {
		return nil, errors.New("empty session id")
	}

	// 1. Check L1 Memory Cache
	s.l1Mutex.RLock()
	item, found := s.l1Cache[sessionID]
	s.l1Mutex.RUnlock()

	if found && time.Now().Before(item.expiry) {
		return item.session, nil
	}

	// 2. Check L2 Redis
	session, err := s.redisRepo.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	// 3. Populate L1 Cache
	s.l1Mutex.Lock()
	s.l1Cache[sessionID] = l1Item{
		session: session,
		expiry:  time.Now().Add(s.l1TTL),
	}
	s.l1Mutex.Unlock()

	return session, nil
}

// RevokeSession removes session from both L1 and L2
func (s *SessionService) RevokeSession(ctx context.Context, sessionID string) error {
	// Remove from L1
	s.l1Mutex.Lock()
	delete(s.l1Cache, sessionID)
	s.l1Mutex.Unlock()

	// Remove from L2
	return s.redisRepo.DeleteSession(ctx, sessionID)
}

// RevokeAllUserSessions purges all active sessions for a user (Force Logout)
func (s *SessionService) RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error {
	// Purge L1 entries belonging to this user
	s.l1Mutex.Lock()
	for k, v := range s.l1Cache {
		if v.session != nil && v.session.UserID == userID {
			delete(s.l1Cache, k)
		}
	}
	s.l1Mutex.Unlock()

	// Purge L2 entries in Redis
	return s.redisRepo.DeleteAllUserSessions(ctx, userID)
}
