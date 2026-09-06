package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheService interface {
	Get(ctx context.Context, key string, dest interface{}) (bool, error)
	Set(ctx context.Context, key string, val interface{}, ttl time.Duration) error
	InvalidatePrefix(ctx context.Context, prefixes ...string) error
}

type RedisCacheService struct {
	client *redis.Client
}

func NewRedisCacheService(client *redis.Client) *RedisCacheService {
	return &RedisCacheService{client: client}
}

// Get retrieves cached data by key and unmarshals it into dest.
// Returns (true, nil) on cache hit, (false, nil) on cache miss.
func (c *RedisCacheService) Get(ctx context.Context, key string, dest interface{}) (bool, error) {
	if c == nil || c.client == nil {
		return false, nil
	}

	data, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return false, nil // Cache miss
		}
		log.Printf("[RedisCache] Error getting key %s: %v", key, err)
		return false, err
	}

	if err := json.Unmarshal(data, dest); err != nil {
		log.Printf("[RedisCache] Error unmarshaling key %s: %v", key, err)
		return false, err
	}

	return true, nil
}

// Set marshals value into JSON and stores it in Redis with the given TTL.
func (c *RedisCacheService) Set(ctx context.Context, key string, val interface{}, ttl time.Duration) error {
	if c == nil || c.client == nil {
		return nil
	}

	bytes, err := json.Marshal(val)
	if err != nil {
		log.Printf("[RedisCache] Error marshaling value for key %s: %v", key, err)
		return err
	}

	if err := c.client.Set(ctx, key, bytes, ttl).Err(); err != nil {
		log.Printf("[RedisCache] Error setting key %s: %v", key, err)
		return err
	}

	return nil
}

// InvalidatePrefix safely scans and deletes all keys matching each prefix pattern.
// Non-blocking via SCAN iterator.
func (c *RedisCacheService) InvalidatePrefix(ctx context.Context, prefixes ...string) error {
	if c == nil || c.client == nil {
		return nil
	}

	for _, prefix := range prefixes {
		pattern := prefix
		if len(prefix) > 0 && prefix[len(prefix)-1] != '*' {
			pattern = prefix + "*"
		}

		var cursor uint64
		for {
			keys, nextCursor, err := c.client.Scan(ctx, cursor, pattern, 100).Result()
			if err != nil {
				log.Printf("[RedisCache] Error scanning pattern %s: %v", pattern, err)
				break
			}

			if len(keys) > 0 {
				if err := c.client.Del(ctx, keys...).Err(); err != nil {
					log.Printf("[RedisCache] Error deleting %d keys matching %s: %v", len(keys), pattern, err)
				} else {
					log.Printf("[RedisCache] Invalidation: deleted %d keys matching %s", len(keys), pattern)
				}
			}

			cursor = nextCursor
			if cursor == 0 {
				break
			}
		}
	}

	return nil
}

// BuildCacheKey helper to create uniform namespaced keys
func BuildCacheKey(namespace string, parts ...interface{}) string {
	key := fmt.Sprintf("cache:%s", namespace)
	for _, part := range parts {
		key += fmt.Sprintf(":%v", part)
	}
	return key
}
