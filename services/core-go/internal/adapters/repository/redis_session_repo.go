package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/cashflow-shipment-app/backend/internal/core/domain"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type RedisSessionRepo struct {
	client *redis.Client
}

func NewRedisSessionRepo(client *redis.Client) *RedisSessionRepo {
	return &RedisSessionRepo{client: client}
}

func (r *RedisSessionRepo) SaveSession(ctx context.Context, session *domain.UserSession, ttl time.Duration) error {
	data, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("failed to marshal session: %w", err)
	}

	sessionKey := fmt.Sprintf("session:%s", session.SessionID)
	userSessionsKey := fmt.Sprintf("user_sessions:%s", session.UserID.String())

	pipe := r.client.Pipeline()
	pipe.Set(ctx, sessionKey, data, ttl)
	pipe.SAdd(ctx, userSessionsKey, session.SessionID)
	pipe.Expire(ctx, userSessionsKey, ttl)

	_, err = pipe.Exec(ctx)
	return err
}

func (r *RedisSessionRepo) GetSession(ctx context.Context, sessionID string) (*domain.UserSession, error) {
	sessionKey := fmt.Sprintf("session:%s", sessionID)
	data, err := r.client.Get(ctx, sessionKey).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, errors.New("session not found or expired")
		}
		return nil, err
	}

	var session domain.UserSession
	if err := json.Unmarshal(data, &session); err != nil {
		return nil, fmt.Errorf("failed to unmarshal session: %w", err)
	}

	return &session, nil
}

func (r *RedisSessionRepo) DeleteSession(ctx context.Context, sessionID string) error {
	sessionKey := fmt.Sprintf("session:%s", sessionID)

	// Fetch to remove from user set if possible
	session, err := r.GetSession(ctx, sessionID)
	if err == nil && session != nil {
		userSessionsKey := fmt.Sprintf("user_sessions:%s", session.UserID.String())
		r.client.SRem(ctx, userSessionsKey, sessionID)
	}

	return r.client.Del(ctx, sessionKey).Err()
}

func (r *RedisSessionRepo) DeleteAllUserSessions(ctx context.Context, userID uuid.UUID) error {
	userSessionsKey := fmt.Sprintf("user_sessions:%s", userID.String())

	// Get all session IDs for this user
	sessionIDs, err := r.client.SMembers(ctx, userSessionsKey).Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		return err
	}

	pipe := r.client.Pipeline()
	for _, sID := range sessionIDs {
		pipe.Del(ctx, fmt.Sprintf("session:%s", sID))
	}
	pipe.Del(ctx, userSessionsKey)

	_, err = pipe.Exec(ctx)
	return err
}
