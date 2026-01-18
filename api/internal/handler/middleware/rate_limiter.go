package middleware

import (
	"net/http"
	"sync"

	"golang.org/x/time/rate"
)

// RateLimiter provides in-memory rate limiting per key (email, IP, etc.)
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

// NewRateLimiter creates a rate limiter with specified rate and burst
// rate: requests per second, burst: max burst size
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     r,
		burst:    burst,
	}
}

// getLimiter returns the rate limiter for the given key, creating if needed
func (rl *RateLimiter) getLimiter(key string) *rate.Limiter {
	rl.mu.RLock()
	limiter, exists := rl.limiters[key]
	rl.mu.RUnlock()

	if exists {
		return limiter
	}

	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Double-check after acquiring write lock
	if limiter, exists = rl.limiters[key]; exists {
		return limiter
	}

	limiter = rate.NewLimiter(rl.rate, rl.burst)
	rl.limiters[key] = limiter
	return limiter
}

// Allow checks if a request for the given key is allowed
func (rl *RateLimiter) Allow(key string) bool {
	return rl.getLimiter(key).Allow()
}

// KeyExtractor defines how to extract the rate limit key from a request
type KeyExtractor func(r *http.Request) string

// IPKeyExtractor extracts the client IP address as the rate limit key
func IPKeyExtractor(r *http.Request) string {
	// Check X-Forwarded-For first for proxied requests
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	return r.RemoteAddr
}

// RateLimitMiddleware creates a middleware that rate limits requests
func RateLimitMiddleware(limiter *RateLimiter, keyExtractor KeyExtractor) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := keyExtractor(r)

			if !limiter.Allow(key) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "60")
				w.WriteHeader(http.StatusTooManyRequests)
				w.Write([]byte(`{"data":null,"error":{"code":"rate_limit_exceeded","message":"Too many requests. Please try again later."}}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// OTP rate limiter: 5 requests per hour = 5/3600 per second
var OTPLimiter = NewRateLimiter(rate.Limit(5.0/3600.0), 5)

// OAuth rate limiter: 20 requests per hour = 20/3600 per second
var OAuthLimiter = NewRateLimiter(rate.Limit(20.0/3600.0), 20)
