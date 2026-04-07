/**
 * Shared TypeScript interfaces and types for Casino Chat SaaS
 * Used across API, WebSocket, and Admin services
 */

/* ==================== Tenant & Configuration ==================== */

export enum FeatureTier {
  BASIC = 'basic',
  SOCIAL = 'social',
  ENGAGE = 'engage',
  MONETIZE = 'monetize'
}

export interface Tenant {
  id: string;
  casino_id: string;
  name: string;
  api_secret: string;
  api_secret_rotated_at: string;
  subscription_tier: FeatureTier;
  subscription_expires_at: string | null;
  is_active: boolean;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  language?: string;
  timezone?: string;
  currency?: string;
  moderation_mode?: 'strict' | 'moderate' | 'lenient';
  auto_delete_messages_after_days?: number;
  rate_limit_messages_per_minute?: number;
  feature_flags?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface TenantConfig {
  tenant_id: string;
  features: FeatureFlag[];
  limits: {
    messages_per_minute: number;
    channels_max: number;
    admins_max: number;
    custom_words_max: number;
  };
  settings: TenantSettings;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/* ==================== Channel ==================== */

export interface Channel {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  requires_wager: boolean;
  min_level: number;
  color?: string;
  message_count: number;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ChannelCreateInput {
  name: string;
  description?: string;
  is_public?: boolean;
  requires_wager?: boolean;
  min_level?: number;
  color?: string;
}

export interface ChannelUpdateInput {
  name?: string;
  description?: string;
  is_public?: boolean;
  requires_wager?: boolean;
  min_level?: number;
  color?: string;
}

/* ==================== Player ==================== */

export enum PremiumTier {
  GOLD = 'gold',
  PLATINUM = 'platinum',
  VIP = 'vip'
}

export interface Player {
  id: string;
  tenant_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  level: number;
  badges: string[];
  is_premium: boolean;
  premium_tier?: PremiumTier;
  premium_expires_at?: string;
  currency?: string;
  country?: string;
  is_blocked: boolean;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerUpdateInput {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  level?: number;
  badges?: string[];
  is_premium?: boolean;
  premium_tier?: PremiumTier;
  premium_expires_at?: string;
  currency?: string;
  country?: string;
}

export interface PlayerStats {
  id: string;
  tenant_id: string;
  player_id: string;
  messages_sent: number;
  messages_deleted: number;
  reports_filed: number;
  times_reported: number;
  times_blocked: number;
  rain_events_won: number;
  rain_total_won: number;
  trivia_games_played: number;
  trivia_correct_answers: number;
  tips_given: number;
  tips_received: number;
  last_activity_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  points: number;
  level: number;
}

/* ==================== Messages ==================== */

export type MessageType = 'text' | 'system' | 'win' | 'rain' | 'trivia' | 'promo' | 'tip';

export type Message = TextMessage | SystemMessage | WinMessage | RainMessage | TriviaMessage | PromoMessage | TipMessage;

export interface BaseMessage {
  id: string;
  tenant_id: string;
  channel_id: string;
  player_id?: string;
  reply_to_id?: string;
  is_deleted: boolean;
  deleted_reason?: string;
  deleted_by_admin_id?: string;
  created_at: string;
}

export interface TextMessage extends BaseMessage {
  content_type: 'text';
  content: string;
  metadata?: {
    edited_at?: string;
    original_content?: string;
    [key: string]: unknown;
  };
}

export interface SystemMessage extends BaseMessage {
  content_type: 'system';
  content: string;
  metadata?: {
    event_type?: string;
    [key: string]: unknown;
  };
}

export interface WinMessage extends BaseMessage {
  content_type: 'win';
  content: string;
  metadata: {
    amount: number;
    game_id: string;
    game_name?: string;
    player_username: string;
  };
}

export interface RainMessage extends BaseMessage {
  content_type: 'rain';
  content: string;
  metadata: {
    rain_event_id: string;
    total_pool: number;
    duration_seconds: number;
  };
}

export interface TriviaMessage extends BaseMessage {
  content_type: 'trivia';
  content: string;
  metadata: {
    question_id: string;
    question: string;
    point_value: number;
  };
}

export interface PromoMessage extends BaseMessage {
  content_type: 'promo';
  content: string;
  metadata: {
    promo_card_id: string;
    title: string;
    cta_url?: string;
  };
}

export interface TipMessage extends BaseMessage {
  content_type: 'tip';
  content: string;
  metadata: {
    sender_player_id: string;
    sender_username: string;
    recipient_player_id: string;
    recipient_username: string;
    amount: number;
  };
}

export interface MessageCreateInput {
  channel_id: string;
  content: string;
  reply_to_id?: string;
}

/* ==================== Chat Events (WebSocket) ==================== */

export interface ChatEvent {
  type: ChatEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export enum ChatEventType {
  // Client -> Server
  MESSAGE_SEND = 'chat:message',
  TYPING_START = 'chat:typing',
  TYPING_STOP = 'chat:typing:stop',
  MESSAGE_READ = 'chat:read',
  CHANNEL_JOIN = 'channel:join',
  CHANNEL_LEAVE = 'channel:leave',
  PLAYER_REPORT = 'player:report',
  RAIN_CLAIM = 'rain:claim',

  // Server -> Client
  MESSAGE_NEW = 'chat:message:new',
  MESSAGE_UPDATED = 'chat:message:updated',
  MESSAGE_DELETED = 'chat:message:deleted',
  TYPING_ACTIVE = 'chat:typing:active',
  USER_JOINED = 'chat:user:joined',
  USER_LEFT = 'chat:user:left',
  NOTIFICATION = 'system:notification',
  PLAYER_BLOCKED = 'player:blocked',
  RAIN_ACTIVE = 'rain:event:active',
  RAIN_CLAIMS_UPDATED = 'rain:claims:updated',
  MODERATION_ACTION = 'moderation:action',
  TRIVIA_QUESTION = 'trivia:question',
  TRIVIA_RESULTS = 'trivia:results'
}

export interface ClientChatMessage {
  channel_id: string;
  content: string;
  reply_to_id?: string;
}

export interface ServerChatMessage {
  id: string;
  channel_id: string;
  player_id?: string;
  username?: string;
  avatar_url?: string;
  content: string;
  type: MessageType;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface TypingEvent {
  channel_id: string;
  player_id: string;
  username: string;
  is_typing: boolean;
}

export interface ChannelJoinEvent {
  channel_id: string;
  recent_messages: ServerChatMessage[];
  active_users: number;
}

export interface SystemNotification {
  type: 'level_up' | 'wager_gate' | 'premium_feature' | 'feature_unlocked';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface ModerationAction {
  action_id: string;
  type: 'message_deleted' | 'player_blocked' | 'player_muted';
  target_id: string;
  reason?: string;
  timestamp: string;
}

/* ==================== Rain Events ==================== */

export interface RainEvent {
  id: string;
  tenant_id: string;
  total_pool: number;
  remaining_pool: number;
  duration_seconds: number;
  claim_window_seconds: number;
  min_wager_requirement: number;
  claimed_count: number;
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface RainClaim {
  id: string;
  rain_event_id: string;
  player_id: string;
  amount_won: number;
  claimed_at: string;
}

export interface RainEventTrigger {
  total_pool: number;
  duration_seconds?: number;
  claim_window_seconds?: number;
  min_wager_requirement?: number;
  metadata?: {
    title?: string;
    description?: string;
  };
}

/* ==================== Trivia ==================== */

export enum TriviaDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

export interface TriviaQuestion {
  id: string;
  tenant_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: TriviaDifficulty;
  point_value: number;
  category?: string;
  created_by_admin_id?: string;
  created_at: string;
}

export interface TriviaQuestionCreateInput {
  question: string;
  options: string[];
  correct_answer: number;
  difficulty?: TriviaDifficulty;
  point_value?: number;
  category?: string;
}

export interface TriviaAnswer {
  id: string;
  trivia_question_id: string;
  player_id: string;
  selected_answer: number;
  is_correct: boolean;
  points_awarded: number;
  answered_at: string;
}

/* ==================== Promotions ==================== */

export interface PromoCard {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  image_url?: string;
  cta_url?: string;
  cta_text?: string;
  start_date: string;
  end_date: string;
  target_level: number;
  is_active: boolean;
  impressions: number;
  clicks: number;
  created_by_admin_id?: string;
  created_at: string;
}

export interface PromoCardCreateInput {
  title: string;
  description?: string;
  image_url?: string;
  cta_url?: string;
  cta_text?: string;
  start_date: string;
  end_date: string;
  target_level?: number;
}

/* ==================== Tipping ==================== */

export interface TipTransaction {
  id: string;
  tenant_id: string;
  sender_player_id: string;
  recipient_player_id: string;
  amount: number;
  message?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface TipCreateInput {
  recipient_player_id: string;
  amount: number;
  message?: string;
}

/* ==================== Moderation ==================== */

export interface BannedWord {
  id: string;
  tenant_id: string;
  pattern: string;
  action: 'block' | 'replace' | 'warn';
  replacement?: string;
  case_sensitive: boolean;
  is_regex: boolean;
  created_by_admin_id?: string;
  created_at: string;
}

export interface BannedWordCreateInput {
  pattern: string;
  action?: 'block' | 'replace' | 'warn';
  replacement?: string;
  case_sensitive?: boolean;
  is_regex?: boolean;
}

export interface PlayerBlock {
  id: string;
  tenant_id: string;
  blocked_player_id: string;
  reason?: string;
  duration_minutes?: number;
  expires_at?: string;
  admin_id?: string;
  created_at: string;
}

export interface PlayerBlockInput {
  reason?: string;
  duration_minutes?: number;
}

export interface PlayerReport {
  id: string;
  tenant_id: string;
  reported_player_id: string;
  reporter_player_id: string;
  message_id?: string;
  reason: 'harassment' | 'spam' | 'offensive' | 'bot' | 'other';
  details?: string;
  status: 'new' | 'under_review' | 'resolved' | 'dismissed';
  moderator_id?: string;
  resolved_at?: string;
  created_at: string;
}

export interface PlayerReportInput {
  reported_player_id: string;
  message_id?: string;
  reason: 'harassment' | 'spam' | 'offensive' | 'bot' | 'other';
  details?: string;
}

export interface ModerationLog {
  id: string;
  tenant_id: string;
  action_type: 'message_deleted' | 'player_blocked' | 'player_muted' | 'word_filtered';
  target_type: 'message' | 'player';
  target_id: string;
  admin_id?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/* ==================== Admin Users ==================== */

export enum AdminRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  ANALYST = 'analyst'
}

export interface TenantAdmin {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  name?: string;
  role: AdminRole;
  permissions: string[];
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminCreateInput {
  email: string;
  password: string;
  name?: string;
  role?: AdminRole;
  permissions?: string[];
}

export interface AdminUpdateInput {
  email?: string;
  name?: string;
  role?: AdminRole;
  is_active?: boolean;
}

/* ==================== API Requests/Responses ==================== */

export interface CasinoEventPayload {
  player_id: string;
  casino_id: string;
  timestamp?: string;
}

export interface WinEventPayload extends CasinoEventPayload {
  amount: number;
  game_id: string;
  game_name?: string;
}

export interface WagerEventPayload extends CasinoEventPayload {
  amount: number;
  game_id: string;
  multiplier?: number;
}

export interface LevelUpEventPayload extends CasinoEventPayload {
  new_level: number;
  previous_level?: number;
}

export interface PlayerUpdatePayload {
  player_id: string;
  casino_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  level?: number;
  badges?: string[];
  is_premium?: boolean;
  currency?: string;
  country?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/* ==================== Authentication ==================== */

export interface JwtPayload {
  sub: string;
  tenant_id: string;
  casino_id?: string;
  player_id?: string;
  role?: AdminRole;
  permissions?: string[];
  iat: number;
  exp: number;
}

export interface HmacSignatureInput {
  player_id: string;
  casino_id: string;
  [key: string]: unknown;
}
