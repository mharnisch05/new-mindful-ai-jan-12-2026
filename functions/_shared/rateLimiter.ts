// Server-side rate limiting for edge functions
// This provides in-memory rate limiting (note: resets on function cold start)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const checkRateLimit = (
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
  const key = `${identifier}`;
  const entry = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (entry.count >= config.maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: entry.resetTime 
    };
  }

  entry.count++;
  return { 
    allowed: true, 
    remaining: config.maxRequests - entry.count, 
    resetTime: entry.resetTime 
  };
};

export const RATE_LIMITS = {
  AUTH: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  AI_ACTION: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  CHECKOUT: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  EMAIL: { maxRequests: 50, windowMs: 60 * 1000 }, // 50 per minute
};

export const getRateLimitHeaders = (
  remaining: number,
  resetTime: number
): Record<string, string> => {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(resetTime).toISOString(),
  };
};
