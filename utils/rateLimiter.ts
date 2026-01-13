// Rate limiting utility for client-side request throttling
// Note: Server-side rate limiting should be implemented at edge function level

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    if (entry.count >= config.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  reset(key: string): void {
    this.limits.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup old entries every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

// Common rate limit configurations
export const RATE_LIMITS = {
  AUTH: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  API: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  AI: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  EXPORT: { maxRequests: 3, windowMs: 60 * 1000 }, // 3 per minute
};
