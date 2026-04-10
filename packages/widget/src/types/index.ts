// ─── Configuration ───────────────────────────────────────────────────────────

export interface ChatConfig {
  tenantId: string;
  containerId?: string;
  playerToken?: string | null;
  theme?: Partial<ThemeConfig>;
  locale?: string;
  defaultChannel?: string;
  serverUrl?: string;
  defaultOpen?: boolean;
  mode?: 'floating' | 'sidebar' | 'fullscreen';
}

export interface ThemeConfig {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  width: number;
  height: number;
}

// ─── Player ─────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  username: string;
  avatarUrl?: string;
  avatarColor?: string;
  level: number;
  vipStatus: VipStatus;
  isPremium: boolean;
  premiumStyle?: 'rainbow' | 'sparkle' | 'vip' | '';
  isModerator: boolean;
  isStreamer: boolean;
  viewerCount?: number;
  memberSince?: string;
  totalWagered?: number;
  favoriteGame?: string;
  winCount?: number;
}

export type VipStatus = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

// ─── Messages ───────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'win' | 'rain' | 'trivia' | 'promo' | 'tip' | 'system';

export interface ChatMessage {
  id: string;
  type: MessageType;
  // Player info (for text, win, tip messages)
  playerId?: string;
  username?: string;
  avatarUrl?: string;
  avatarColor?: string;
  level?: number;
  vipStatus?: VipStatus;
  isPremium?: boolean;
  premiumStyle?: string;
  isModerator?: boolean;
  isStreamer?: boolean;
  // Content
  content: MessageContent;
  replyTo?: ReplyRef | null;
  // Engagement
  reactions?: Record<string, number>;
  likes?: number;
  // Meta
  createdAt: string;
  sequenceNum?: string;
  isRemoved?: boolean;
}

export interface MessageContent {
  text?: string;
  // Win card data
  game?: string;
  gameIcon?: string;
  bet?: number;
  win?: number;
  multiplier?: number;
  currency?: string;
  // Rain data
  initiator?: string;
  amount?: number;
  playerCount?: number;
  perPlayer?: number;
  duration?: number;
  timeLeft?: number;
  // Trivia data
  question?: string;
  options?: string[];
  correctIndex?: number;
  resolved?: boolean;
  winner?: string;
  reward?: string;
  // Promo data
  title?: string;
  subtitle?: string;
  detailText?: string;
  ctaText?: string;
  ctaUrl?: string;
  emoji?: string;
  accentColor?: string;
  // Tip data
  fromPlayer?: string;
  toPlayer?: string;
  tipAmount?: number;
  tipCurrency?: string;
  // Reshare
  resharedBy?: string;
  reshareComment?: string;
}

export interface ReplyRef {
  id: string;
  username: string;
  text: string;
}

// ─── Channel ────────────────────────────────────────────────────────────────

export interface Channel {
  id: string;
  name: string;
  emoji: string;
  language: string;
  description: string;
  isActive: boolean;
}

// ─── Events ─────────────────────────────────────────────────────────────────

export interface RainEventData {
  id: string;
  initiator: string;
  amount: number;
  currency: string;
  playerCount: number;
  perPlayer: number;
  duration: number;
  timeLeft: number;
}

export interface TriviaEventData {
  id: string;
  question: string;
  options: string[];
  duration: number;
  resolved: boolean;
  correctIndex?: number;
  winner?: string;
  reward?: string;
}

// ─── Feature Gating ─────────────────────────────────────────────────────────

export interface TenantFeatures {
  textChat: boolean;
  channels: boolean;
  moderation: boolean;
  replyThreads: boolean;
  wagerGate: boolean;
  winCards: boolean;
  reactions: boolean;
  gifEmoji: boolean;
  playerProfiles: boolean;
  playerLevels: boolean;
  rainEvents: boolean;
  promoCards: boolean;
  leaderboard: boolean;
  trivia: boolean;
  tipping: boolean;
  premiumChat: boolean;
  streamerMode: boolean;
}
