/**
 * Shared constants for Casino Chat SaaS
 */

/* ==================== Feature Keys ==================== */

export const FEATURE_KEYS = {
  GLOBAL_CHAT: 'GLOBAL_CHAT',
  CHANNEL_SYSTEM: 'CHANNEL_SYSTEM',
  WAGER_GATE: 'WAGER_GATE',
  MODERATION: 'MODERATION',
  REPLY_THREAD: 'REPLY_THREAD',
  WIN_CARDS: 'WIN_CARDS',
  REACTIONS: 'REACTIONS',
  GIF_EMOJI: 'GIF_EMOJI',
  PLAYER_PROFILES: 'PLAYER_PROFILES',
  WIN_RESHARE: 'WIN_RESHARE',
  PLAYER_LEVELS: 'PLAYER_LEVELS',
  RAIN_EVENTS: 'RAIN_EVENTS',
  PROMO_CARDS: 'PROMO_CARDS',
  LEADERBOARD: 'LEADERBOARD',
  TRIVIA: 'TRIVIA',
  TIPPING: 'TIPPING',
  PREMIUM_CHAT: 'PREMIUM_CHAT',
  STREAMER_MODE: 'STREAMER_MODE'
} as const;

/* ==================== Feature Tier Definitions ==================== */

export const TIER_FEATURES = {
  basic: [
    FEATURE_KEYS.GLOBAL_CHAT,
    FEATURE_KEYS.CHANNEL_SYSTEM,
    FEATURE_KEYS.MODERATION,
    FEATURE_KEYS.PLAYER_PROFILES
  ],
  social: [
    FEATURE_KEYS.GLOBAL_CHAT,
    FEATURE_KEYS.CHANNEL_SYSTEM,
    FEATURE_KEYS.MODERATION,
    FEATURE_KEYS.PLAYER_PROFILES,
    FEATURE_KEYS.REPLY_THREAD,
    FEATURE_KEYS.REACTIONS,
    FEATURE_KEYS.GIF_EMOJI,
    FEATURE_KEYS.PLAYER_LEVELS
  ],
  engage: [
    FEATURE_KEYS.GLOBAL_CHAT,
    FEATURE_KEYS.CHANNEL_SYSTEM,
    FEATURE_KEYS.MODERATION,
    FEATURE_KEYS.PLAYER_PROFILES,
    FEATURE_KEYS.REPLY_THREAD,
    FEATURE_KEYS.REACTIONS,
    FEATURE_KEYS.GIF_EMOJI,
    FEATURE_KEYS.PLAYER_LEVELS,
    FEATURE_KEYS.WIN_CARDS,
    FEATURE_KEYS.WIN_RESHARE,
    FEATURE_KEYS.WAGER_GATE,
    FEATURE_KEYS.RAIN_EVENTS,
    FEATURE_KEYS.PROMO_CARDS,
    FEATURE_KEYS.LEADERBOARD
  ],
  monetize: [
    FEATURE_KEYS.GLOBAL_CHAT,
    FEATURE_KEYS.CHANNEL_SYSTEM,
    FEATURE_KEYS.MODERATION,
    FEATURE_KEYS.PLAYER_PROFILES,
    FEATURE_KEYS.REPLY_THREAD,
    FEATURE_KEYS.REACTIONS,
    FEATURE_KEYS.GIF_EMOJI,
    FEATURE_KEYS.PLAYER_LEVELS,
    FEATURE_KEYS.WIN_CARDS,
    FEATURE_KEYS.WIN_RESHARE,
    FEATURE_KEYS.WAGER_GATE,
    FEATURE_KEYS.RAIN_EVENTS,
    FEATURE_KEYS.PROMO_CARDS,
    FEATURE_KEYS.LEADERBOARD,
    FEATURE_KEYS.TRIVIA,
    FEATURE_KEYS.TIPPING,
    FEATURE_KEYS.PREMIUM_CHAT,
    FEATURE_KEYS.STREAMER_MODE
  ]
} as const;

/* ==================== WebSocket Event Names ==================== */

export const WS_EVENTS = {
  // Client -> Server
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_TYPING_STOP: 'chat:typing:stop',
  CHAT_READ: 'chat:read',
  CHANNEL_JOIN: 'channel:join',
  CHANNEL_LEAVE: 'channel:leave',
  PLAYER_REPORT: 'player:report',
  RAIN_CLAIM: 'rain:claim',

  // Server -> Client
  CHAT_MESSAGE_NEW: 'chat:message:new',
  CHAT_MESSAGE_UPDATED: 'chat:message:updated',
  CHAT_MESSAGE_DELETED: 'chat:message:deleted',
  CHAT_TYPING_ACTIVE: 'chat:typing:active',
  CHAT_USER_JOINED: 'chat:user:joined',
  CHAT_USER_LEFT: 'chat:user:left',
  SYSTEM_NOTIFICATION: 'system:notification',
  PLAYER_BLOCKED: 'player:blocked',
  RAIN_EVENT_ACTIVE: 'rain:event:active',
  RAIN_CLAIMS_UPDATED: 'rain:claims:updated',
  MODERATION_ACTION: 'moderation:action',
  TRIVIA_QUESTION: 'trivia:question',
  TRIVIA_RESULTS: 'trivia:results',
  CONNECTION_ERROR: 'connection:error',
  CONNECTION_RECONNECT: 'connection:reconnect'
} as const;

/* ==================== Message Source Enum ==================== */

export const MESSAGE_SOURCES = {
  PLAYER: 'player',
  SYSTEM: 'system',
  BOT: 'bot',
  INTEGRATION: 'integration'
} as const;

export type MessageSource = typeof MESSAGE_SOURCES[keyof typeof MESSAGE_SOURCES];

/* ==================== HTTP Status Codes ==================== */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMIT: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

/* ==================== Error Codes ==================== */

export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  PLAYER_BLOCKED: 'PLAYER_BLOCKED',
  CHANNEL_FULL: 'CHANNEL_FULL',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INVALID_FEATURE: 'INVALID_FEATURE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
} as const;

/* ==================== Default Configuration ==================== */

export const DEFAULT_CONFIG = {
  // Message limits
  MESSAGE_MAX_LENGTH: 5000,
  MESSAGE_MIN_LENGTH: 1,
  MESSAGES_PER_MINUTE_LIMIT: 10,
  CHANNEL_MESSAGES_PER_MINUTE_LIMIT: 1000,

  // Pagination
  PAGINATION_DEFAULT_LIMIT: 20,
  PAGINATION_MAX_LIMIT: 100,
  PAGINATION_DEFAULT_PAGE: 1,

  // Cache TTL (in seconds)
  CACHE_TTL_PLAYER: 3600, // 1 hour
  CACHE_TTL_CHANNEL: 1800, // 30 minutes
  CACHE_TTL_MESSAGE_BUFFER: 86400, // 24 hours
  CACHE_TTL_LEADERBOARD_HOURLY: 7200, // 2 hours
  CACHE_TTL_LEADERBOARD_DAILY: 604800, // 7 days
  CACHE_TTL_ACTIVE_USERS: 30, // 30 seconds
  CACHE_TTL_RAIN_CLAIMS: 3600, // 1 hour

  // Message retention
  MESSAGE_RETENTION_DAYS: 90,
  MESSAGE_BUFFER_MAX_SIZE: 100,

  // Rain events
  RAIN_DEFAULT_DURATION_SECONDS: 60,
  RAIN_DEFAULT_CLAIM_WINDOW_SECONDS: 120,

  // JWT
  JWT_EXPIRY_SECONDS: 3600, // 1 hour
  JWT_REFRESH_EXPIRY_SECONDS: 604800, // 7 days
  JWT_ISSUER: 'casino-chat',

  // HMAC signature
  HMAC_SIGNATURE_WINDOW_SECONDS: 300, // 5 minutes
  HMAC_ALGORITHM: 'sha256',
  API_SECRET_MIN_LENGTH: 32,

  // WebSocket
  WS_HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
  WS_HEARTBEAT_TIMEOUT_MS: 5000, // 5 seconds
  WS_MAX_PAYLOAD_SIZE: 100000, // 100 KB
  WS_RECONNECT_DELAY_MS: 1000, // 1 second
  WS_MAX_RECONNECT_ATTEMPTS: 5,

  // Moderation
  AUTOMOD_WORD_FILTER_ENABLED: true,
  MODERATION_ACTION_BUFFER_SIZE: 1000,

  // Analytics
  ANALYTICS_BATCH_SIZE: 1000,
  ANALYTICS_FLUSH_INTERVAL_MS: 30000, // 30 seconds

  // Rate limiting
  RATE_LIMIT_WINDOW_SECONDS: 60,
  RATE_LIMIT_CLEANUP_INTERVAL_MS: 60000, // 1 minute

  // Leaderboard
  LEADERBOARD_DEFAULT_SIZE: 100,
  LEADERBOARD_UPDATE_BATCH_SIZE: 10,

  // Admin session
  ADMIN_SESSION_TIMEOUT_MINUTES: 30,
  ADMIN_LOCK_TIMEOUT_MINUTES: 15
} as const;

/* ==================== Moderation Actions ==================== */

export const MODERATION_ACTIONS = {
  MESSAGE_DELETED: 'message_deleted',
  PLAYER_BLOCKED: 'player_blocked',
  PLAYER_MUTED: 'player_muted',
  WORD_FILTERED: 'word_filtered'
} as const;

/* ==================== Player Report Reasons ==================== */

export const REPORT_REASONS = {
  HARASSMENT: 'harassment',
  SPAM: 'spam',
  OFFENSIVE: 'offensive',
  BOT: 'bot',
  OTHER: 'other'
} as const;

/* ==================== Premium Tiers ==================== */

export const PREMIUM_TIERS = {
  GOLD: 'gold',
  PLATINUM: 'platinum',
  VIP: 'vip'
} as const;

export const PREMIUM_TIER_BENEFITS = {
  gold: [
    'custom_profile_color',
    'badge_display',
    'priority_support',
    'ad_free'
  ],
  platinum: [
    'custom_profile_color',
    'badge_display',
    'priority_support',
    'ad_free',
    'custom_emoji',
    'message_history'
  ],
  vip: [
    'custom_profile_color',
    'badge_display',
    'priority_support',
    'ad_free',
    'custom_emoji',
    'message_history',
    'channel_creation',
    'direct_support'
  ]
} as const;

/* ==================== Trivia Difficulty ==================== */

export const TRIVIA_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
} as const;

export const TRIVIA_POINT_VALUES = {
  easy: 5,
  medium: 10,
  hard: 25
} as const;

/* ==================== Admin Roles ==================== */

export const ADMIN_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  ANALYST: 'analyst'
} as const;

export const ADMIN_ROLE_PERMISSIONS = {
  admin: [
    'admin:read',
    'admin:write',
    'channels:create',
    'channels:delete',
    'channels:manage',
    'moderators:manage',
    'settings:manage',
    'banned_words:manage',
    'promotions:manage',
    'analytics:view',
    'players:block',
    'players:manage',
    'moderation:all'
  ],
  moderator: [
    'admin:read',
    'channels:read',
    'moderators:read',
    'settings:read',
    'banned_words:read',
    'promotions:read',
    'players:block',
    'players:report',
    'messages:delete',
    'moderation:action'
  ],
  analyst: [
    'admin:read',
    'channels:read',
    'settings:read',
    'analytics:view'
  ]
} as const;

/* ==================== Channel Requirements ==================== */

export const CHANNEL_REQUIREMENTS = {
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 500,
  MIN_LEVEL_DEFAULT: 0,
  MAX_CHANNELS_PER_TENANT_BASIC: 5,
  MAX_CHANNELS_PER_TENANT_SOCIAL: 20,
  MAX_CHANNELS_PER_TENANT_ENGAGE: 100,
  MAX_CHANNELS_PER_TENANT_MONETIZE: 500
} as const;

/* ==================== Tenant Subscription Info ==================== */

export const SUBSCRIPTION_TIERS = {
  basic: {
    name: 'Basic',
    price: 0,
    channels: 5,
    admins: 1,
    custom_words: 100,
    daily_api_calls: 100000,
    support: 'email'
  },
  social: {
    name: 'Social',
    price: 99,
    channels: 20,
    admins: 3,
    custom_words: 500,
    daily_api_calls: 500000,
    support: 'priority_email'
  },
  engage: {
    name: 'Engage',
    price: 499,
    channels: 100,
    admins: 10,
    custom_words: 2000,
    daily_api_calls: 2000000,
    support: 'priority_email_phone'
  },
  monetize: {
    name: 'Monetize',
    price: 1999,
    channels: 500,
    admins: 50,
    custom_words: 5000,
    daily_api_calls: 10000000,
    support: 'dedicated_account_manager'
  }
} as const;

/* ==================== Database Constraints ==================== */

export const DB_CONSTRAINTS = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 255,
  DISPLAY_NAME_MAX_LENGTH: 255,
  AVATAR_URL_MAX_LENGTH: 512,
  API_SECRET_MIN_LENGTH: 32,
  PLAYER_LEVEL_MIN: 1,
  PLAYER_LEVEL_MAX: 999,
  RAIN_POOL_MIN: 1,
  TIP_AMOUNT_MIN: 1,
  MESSAGE_BUFFER_MAX_SIZE: 100
} as const;

/* ==================== System Constants ==================== */

export const SYSTEM = {
  NAMESPACE_PREFIX: 'casino-chat',
  VERSION: '1.0.0',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  CHARSET: 'utf-8'
} as const;
