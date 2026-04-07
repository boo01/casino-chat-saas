export interface ChatConfig {
  tenantId: string;
  containerId?: string;
  playerToken?: string | null;
  theme?: Partial<ThemeConfig>;
  locale?: string;
  defaultChannel?: string;
  serverUrl?: string;
}

export interface ThemeConfig {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  width: number;
  height: number;
}

export interface Player {
  id: string;
  username: string;
  avatarUrl?: string;
  level: number;
  vipStatus: string;
  isPremium: boolean;
  premiumStyle: string;
  isModerator: boolean;
  isStreamer: boolean;
}

export interface ChatMessage {
  id: string;
  playerId?: string;
  username?: string;
  avatarUrl?: string;
  level?: number;
  vipStatus?: string;
  isPremium?: boolean;
  premiumStyle?: string;
  isModerator?: boolean;
  isStreamer?: boolean;
  type: string;
  content: { text?: string; [key: string]: any };
  replyToId?: string;
  createdAt: string;
  sequenceNum?: string;
}

export interface Channel {
  id: string;
  name: string;
  emoji: string;
  language: string;
  description: string;
  isActive: boolean;
}
