/**
 * Casino Chat SaaS Shared Package
 * Barrel export for all types, constants, and utilities
 */

// Export all types
export * from './types/index';

// Export all constants
export * from './constants/index';

// Export all utilities
export * from './utils/index';

// Re-export commonly used items as named exports for convenience
export {
  // Signature utilities
  generateHmacSignature,
  validateHmacSignature,
  validateHmacWithTimestamp,
  validateCasinoApiRequest,
  SignatureUtils,
  // JWT utilities
  createJwtPayload,
  isJwtValid,
  getJwtTimeRemaining,
  JwtUtils,
  // Secret utilities
  generateRandomSecret,
  validateSecretStrength,
  SecretUtils,
  // Validation utilities
  sanitizeMessage,
  validateEmail,
  validateUUID,
  validateUrl,
  ValidationUtils,
  // Timestamp utilities
  getCurrentTimestamp,
  addSeconds,
  secondsBetween,
  TimestampUtils,
  // Idempotency utilities
  generateIdempotencyKey,
  isValidIdempotencyKey,
  IdempotencyUtils,
  // Rate limiting utilities
  getRateLimitKey,
  isRateLimited,
  RateLimitUtils
} from './utils/index';
