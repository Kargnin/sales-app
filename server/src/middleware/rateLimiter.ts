import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
}

// Instantiate shared Redis store if REDIS_URL environment variable is provided
let redisStore: RedisStore | undefined;

const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  try {
    const client = createClient({ url: redisUrl });
    
    // Connect client asynchronously to avoid blocking the main server boot sequence
    client.connect().catch((err) => {
      console.error('Failed to connect to Redis for rate limiting:', err);
    });

    redisStore = new RedisStore({
      // @ts-ignore - Ignore type differences between differing major versions of Redis and rate-limit-redis
      sendCommand: async (...args: string[]) => {
        return client.sendCommand(args);
      },
    });
    console.log('Redis rate limit store successfully initialized.');
  } catch (error) {
    console.error('Failed to initialize Redis client for rate limiting:', error);
  }
}

/**
 * Modern rate limiting middleware powered by express-rate-limit.
 * Automatically falls back to standard memory-based rate limiting if Redis is not configured.
 */
export const rateLimiter = (options: RateLimiterOptions) => {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    message: { error: options.message || 'Too many requests from this IP, please try again later.' },
    standardHeaders: true, // Return standard HTTP rate limit info headers
    legacyHeaders: false,  // Disable non-standard X-RateLimit-* headers
    store: redisStore,     // Fallback to standard memory store if undefined
  });
};
