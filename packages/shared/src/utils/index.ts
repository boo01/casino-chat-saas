/**
 * Shared utilities for Casino Chat SaaS
 * HMAC signature generation/validation, JWT helpers, etc.
 */

import crypto from 'crypto';
import { HmacSignatureInput, JwtPayload } from '../types';
import { DEFAULT_CONFIG } from '../constants';

/* ==================== HMAC Signature Utilities ==================== */

/**
 * Generate HMAC-SHA256 signature for API requests
 *
 * @param payload - The request payload to sign
 * @param secret - The signing secret
 * @returns Hex-encoded signature
 *
 * @example
 * const payload = { player_id: 'p123', casino_id: 'acme', amount: 1500 };
 * const signature = generateHmacSignature(payload, 'secret-key');
 */
export function generateHmacSignature(
  payload: Record<string, unknown>,
  secret: string
): string {
  const message = JSON.stringify(payload);
  return crypto
    .createHmac(DEFAULT_CONFIG.HMAC_ALGORITHM, secret)
    .update(message)
    .digest('hex');
}

/**
 * Validate HMAC signature against payload
 *
 * @param payload - The request payload
 * @param signature - The signature to validate
 * @param secret - The signing secret
 * @returns true if signature is valid
 *
 * @example
 * const isValid = validateHmacSignature(payload, signature, 'secret-key');
 */
export function validateHmacSignature(
  payload: Record<string, unknown>,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateHmacSignature(payload, secret);
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Validate HMAC signature with timestamp window to prevent replay attacks
 *
 * @param payload - The request payload
 * @param signature - The signature to validate
 * @param timestamp - The request timestamp (ISO 8601)
 * @param secret - The signing secret
 * @param windowSeconds - Time window tolerance (default: 300 seconds)
 * @returns true if signature is valid and timestamp is within window
 *
 * @example
 * const isValid = validateHmacWithTimestamp(
 *   payload,
 *   signature,
 *   '2026-04-07T10:30:00Z',
 *   'secret-key',
 *   300
 * );
 */
export function validateHmacWithTimestamp(
  payload: Record<string, unknown>,
  signature: string,
  timestamp: string,
  secret: string,
  windowSeconds: number = DEFAULT_CONFIG.HMAC_SIGNATURE_WINDOW_SECONDS
): boolean {
  // Validate signature first
  if (!validateHmacSignature(payload, signature, secret)) {
    return false;
  }

  // Validate timestamp
  const requestTime = new Date(timestamp).getTime();
  const currentTime = Date.now();
  const timeDiff = Math.abs(currentTime - requestTime);
  const windowMs = windowSeconds * 1000;

  return timeDiff <= windowMs;
}

/**
 * Create a signature string for logging/debugging (redacted)
 *
 * @param signature - The full signature
 * @returns Redacted signature (first 8 chars + "...")
 */
export function redactSignature(signature: string): string {
  return `${signature.substring(0, 8)}...`;
}

/* ==================== JWT Utilities ==================== */

/**
 * Create JWT payload structure
 *
 * @param subject - The subject (user/player ID)
 * @param tenantId - The tenant ID
 * @param options - Additional payload options
 * @returns JWT payload object
 *
 * @example
 * const payload = createJwtPayload('player123', 'tenant-uuid', {
 *   casino_id: 'acme',
 *   player_id: 'player123'
 * });
 */
export function createJwtPayload(
  subject: string,
  tenantId: string,
  options?: Partial<JwtPayload>
): JwtPayload {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + DEFAULT_CONFIG.JWT_EXPIRY_SECONDS;

  return {
    sub: subject,
    tenant_id: tenantId,
    iat: now,
    exp,
    ...options
  };
}

/**
 * Validate JWT expiration
 *
 * @param payload - The JWT payload
 * @returns true if token is not expired
 *
 * @example
 * if (isJwtValid(payload)) {
 *   // Token is still valid
 * }
 */
export function isJwtValid(payload: JwtPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

/**
 * Get remaining seconds until JWT expires
 *
 * @param payload - The JWT payload
 * @returns Number of seconds remaining (negative if expired)
 *
 * @example
 * const remaining = getJwtTimeRemaining(payload);
 * console.log(`Token expires in ${remaining} seconds`);
 */
export function getJwtTimeRemaining(payload: JwtPayload): number {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now;
}

/* ==================== API Signature Validation ==================== */

/**
 * Validate casino API request with HMAC signature and timestamp
 *
 * @param headers - Request headers (must include X-Signature, X-Timestamp)
 * @param body - Request body
 * @param secret - API secret
 * @returns Object with validation result and error message
 *
 * @example
 * const result = validateCasinoApiRequest(
 *   {
 *     'x-signature': 'abc123...',
 *     'x-timestamp': '2026-04-07T10:30:00Z'
 *   },
 *   { player_id: 'p1', amount: 100 },
 *   'secret'
 * );
 *
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 */
export function validateCasinoApiRequest(
  headers: Record<string, string | undefined>,
  body: Record<string, unknown>,
  secret: string
): { valid: boolean; error?: string } {
  const signature = headers['x-signature'] || headers['X-Signature'];
  const timestamp = headers['x-timestamp'] || headers['X-Timestamp'];

  if (!signature) {
    return { valid: false, error: 'Missing X-Signature header' };
  }

  if (!timestamp) {
    return { valid: false, error: 'Missing X-Timestamp header' };
  }

  try {
    const isValid = validateHmacWithTimestamp(
      body,
      signature,
      timestamp,
      secret
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature or expired timestamp' };
    }

    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { valid: false, error: `Signature validation failed: ${message}` };
  }
}

/* ==================== Idempotency Helpers ==================== */

/**
 * Generate idempotency key for request deduplication
 * Useful for ensuring API operations are idempotent
 *
 * @param prefix - Optional prefix (e.g., 'rain', 'message')
 * @returns UUID-like idempotency key
 *
 * @example
 * const idempotencyKey = generateIdempotencyKey('rain');
 * // Returns something like: rain-a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
 */
export function generateIdempotencyKey(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}

/**
 * Parse and validate idempotency key format
 *
 * @param key - The idempotency key to validate
 * @returns true if key matches expected format
 *
 * @example
 * const isValid = isValidIdempotencyKey('rain-a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
 */
export function isValidIdempotencyKey(key: string): boolean {
  // UUID v4 format with optional prefix
  const uuidRegex = /^[a-z0-9]*-?[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(key);
}

/* ==================== Token/Secret Generation ==================== */

/**
 * Generate a cryptographically secure random secret
 *
 * @param length - Length of secret in bytes (default: 32)
 * @returns Hex-encoded secret
 *
 * @example
 * const secret = generateRandomSecret(32);
 * // Returns something like: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b
 */
export function generateRandomSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate secret strength
 *
 * @param secret - The secret to validate
 * @returns Object with validation result and recommendations
 *
 * @example
 * const validation = validateSecretStrength('my-weak-secret');
 * if (!validation.isStrong) {
 *   console.log(validation.recommendations);
 * }
 */
export function validateSecretStrength(secret: string): {
  isStrong: boolean;
  score: number;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  let score = 0;

  // Check minimum length
  if (secret.length >= 32) {
    score += 25;
  } else if (secret.length >= 24) {
    score += 15;
  } else {
    recommendations.push('Secret should be at least 32 characters long');
  }

  // Check for variety
  const hasLowercase = /[a-z]/.test(secret);
  const hasUppercase = /[A-Z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);

  if (hasLowercase) score += 15;
  if (hasUppercase) score += 15;
  if (hasNumbers) score += 15;
  if (hasSpecial) score += 15;

  if (!hasLowercase || !hasUppercase) {
    recommendations.push('Use both uppercase and lowercase letters');
  }
  if (!hasNumbers) {
    recommendations.push('Include numbers in the secret');
  }
  if (!hasSpecial) {
    recommendations.push('Include special characters for extra security');
  }

  return {
    isStrong: score >= 75,
    score,
    recommendations
  };
}

/* ==================== Timestamp & Date Utilities ==================== */

/**
 * Get ISO 8601 timestamp (UTC)
 *
 * @returns Current timestamp in ISO 8601 format
 *
 * @example
 * const timestamp = getCurrentTimestamp();
 * // Returns: "2026-04-07T10:30:45.123Z"
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Add seconds to a timestamp
 *
 * @param timestamp - Base timestamp (ISO 8601)
 * @param seconds - Seconds to add
 * @returns New timestamp in ISO 8601 format
 *
 * @example
 * const expiry = addSeconds('2026-04-07T10:30:00Z', 3600);
 */
export function addSeconds(timestamp: string, seconds: number): string {
  const date = new Date(timestamp);
  date.setSeconds(date.getSeconds() + seconds);
  return date.toISOString();
}

/**
 * Calculate seconds between two timestamps
 *
 * @param from - Start timestamp (ISO 8601)
 * @param to - End timestamp (ISO 8601)
 * @returns Number of seconds between timestamps
 *
 * @example
 * const diff = secondsBetween(
 *   '2026-04-07T10:00:00Z',
 *   '2026-04-07T10:05:00Z'
 * );
 * // Returns: 300
 */
export function secondsBetween(from: string, to: string): number {
  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();
  return Math.floor((toTime - fromTime) / 1000);
}

/* ==================== Data Validation Utilities ==================== */

/**
 * Sanitize message content to prevent XSS
 * Removes dangerous HTML/JavaScript
 *
 * @param content - Raw message content
 * @returns Sanitized content safe to display
 *
 * @example
 * const safe = sanitizeMessage('<script>alert("xss")</script>Hello');
 * // Returns: "Hello"
 */
export function sanitizeMessage(content: string): string {
  // Remove script tags
  let sanitized = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  // Remove on* event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  // Basic HTML escape
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  return sanitized.trim();
}

/**
 * Validate email address format
 *
 * @param email - Email to validate
 * @returns true if email format is valid
 *
 * @example
 * const isValid = validateEmail('user@example.com');
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 *
 * @param uuid - UUID string to validate
 * @returns true if UUID format is valid
 *
 * @example
 * const isValid = validateUUID('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate URL format
 *
 * @param url - URL string to validate
 * @returns true if URL format is valid
 *
 * @example
 * const isValid = validateUrl('https://example.com/path');
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/* ==================== Rate Limiting Helpers ==================== */

/**
 * Calculate sliding window rate limit key
 * Used with Redis to implement sliding window rate limiting
 *
 * @param identifier - User/IP identifier
 * @param windowSeconds - Window size in seconds
 * @returns Rate limit key
 *
 * @example
 * const key = getRateLimitKey('player123', 60);
 * // Returns something like: rate_limit:player123:1712483400
 */
export function getRateLimitKey(identifier: string, windowSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  return `rate_limit:${identifier}:${bucket}`;
}

/**
 * Check if request should be rate limited
 *
 * @param count - Current request count
 * @param limit - Maximum requests allowed
 * @returns true if request should be blocked
 *
 * @example
 * const shouldBlock = isRateLimited(currentCount, maxRequests);
 */
export function isRateLimited(count: number, limit: number): boolean {
  return count > limit;
}

/* ==================== Export All for Convenience ==================== */

export const SignatureUtils = {
  generateHmacSignature,
  validateHmacSignature,
  validateHmacWithTimestamp,
  validateCasinoApiRequest,
  redactSignature
};

export const JwtUtils = {
  createJwtPayload,
  isJwtValid,
  getJwtTimeRemaining
};

export const SecretUtils = {
  generateRandomSecret,
  validateSecretStrength
};

export const ValidationUtils = {
  sanitizeMessage,
  validateEmail,
  validateUUID,
  validateUrl
};

export const TimestampUtils = {
  getCurrentTimestamp,
  addSeconds,
  secondsBetween
};

export const IdempotencyUtils = {
  generateIdempotencyKey,
  isValidIdempotencyKey
};

export const RateLimitUtils = {
  getRateLimitKey,
  isRateLimited
};
