package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient(ctx context.Context, redisURL string) (*redis.Client, error) {
	var opts *redis.Options
	if strings.HasPrefix(redisURL, "redis://") || strings.HasPrefix(redisURL, "rediss://") {
		var err error
		opts, err = redis.ParseURL(redisURL)
		if err != nil {
			return nil, fmt.Errorf("invalid redis url %s: %w", redisURL, err)
		}
	} else {
		opts = &redis.Options{
			Addr: redisURL,
		}
	}

	client := redis.NewClient(opts)

	// Test connection with timeout
	pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx).Err(); err != nil {
		return nil, fmt.Errorf("unable to connect to Valkey/Redis at %s: %w", redisURL, err)
	}

	return client, nil
}
