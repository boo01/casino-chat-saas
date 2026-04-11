import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { ChatMessage, ReplyRef } from '../types';

const REPORT_CATEGORIES = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate' },
  { value: 'SCAM', label: 'Scam' },
  { value: 'OTHER', label: 'Other' },
] as const;

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  isGuest?: boolean;
  isLiked?: boolean;
  onLike?: (messageId: string) => void;
  onReply?: (ref: ReplyRef) => void;
  onTip?: (playerId: string, username: string) => void;
  onReport?: (data: { messageId: string; playerId: string; reason: string; category: string }) => void;
}

const VIP_COLORS: Record<string, string> = {
  NONE: '#9CA3AF',
  BRONZE: '#F97316',
  SILVER: '#D1D5DB',
  GOLD: '#EAB308',
  PLATINUM: '#06B6D4',
  DIAMOND: '#A855F7',
};

function getLevelBadgeClass(level: number): string {
  if (level >= 51) return 'cc-msg__level-badge--gold';
  if (level >= 31) return 'cc-msg__level-badge--purple';
  if (level >= 11) return 'cc-msg__level-badge--blue';
  return 'cc-msg__level-badge--gray';
}

function getAvatarColor(username: string, avatarColor?: string): string {
  if (avatarColor) return avatarColor;
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getVipClass(vipStatus?: string): string {
  if (!vipStatus) return 'cc-msg__username--none';
  return `cc-msg__username--${vipStatus.toLowerCase()}`;
}

/** Parse @mentions in text and return array of text/mention segments */
function parseText(text: string): Array<{ type: 'text' | 'mention'; value: string }> {
  const parts: Array<{ type: 'text' | 'mention'; value: string }> = [];
  const regex = /@(\w+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'mention', value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}

export function ChatMessageItem({ message, isOwn, isGuest, isLiked, onLike, onReply, onTip, onReport }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const {
    username,
    avatarUrl,
    avatarColor,
    level,
    vipStatus,
    isPremium,
    premiumStyle,
    isModerator,
    isStreamer,
    content,
    replyTo,
    reactions,
    likes,
    createdAt,
    isRemoved,
  } = message;

  const text = content?.text || '';
  const displayName = username || 'Anonymous';
  const initial = displayName[0].toUpperCase();
  const color = getAvatarColor(displayName, avatarColor);

  // Removed message
  if (isRemoved) {
    return (
      <div class="cc-msg">
        <div class="cc-msg__avatar-wrap">
          <div class="cc-msg__avatar" style={{ backgroundColor: '#374151' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
        <div class="cc-msg__body">
          <span class="cc-msg__text" style={{ color: '#EF4444', opacity: 0.6, fontStyle: 'italic' }}>
            [Message removed by moderator]
          </span>
        </div>
      </div>
    );
  }

  // Build username class
  let usernameClass = `cc-msg__username ${getVipClass(vipStatus)}`;
  if (isPremium && premiumStyle === 'rainbow') {
    usernameClass = 'cc-msg__username cc-msg__username--rainbow';
  } else if (isPremium && premiumStyle === 'sparkle') {
    usernameClass = 'cc-msg__username cc-msg__username--sparkle';
  }

  const usernameColor = (isPremium && premiumStyle === 'rainbow') ? undefined : VIP_COLORS[vipStatus || 'NONE'];

  // Parse text for mentions
  const textSegments = parseText(text);

  // Build reactions list from Record<string, number>
  const reactionEntries = reactions ? Object.entries(reactions) : [];
  const hasReactions = reactionEntries.length > 0 || (likes != null && likes > 0);

  return (
    <div
      class={`cc-msg ${isOwn ? 'cc-msg--own' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowReportDropdown(false); }}
    >
      {/* Avatar with level badge */}
      <div class="cc-msg__avatar-wrap">
        <div
          class="cc-msg__avatar"
          style={{
            backgroundColor: color + '20',
            color: color,
            border: `2px solid ${color}40`,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" />
          ) : (
            initial
          )}
        </div>
        {level != null && level > 0 && (
          <div class={`cc-msg__level-badge ${getLevelBadgeClass(level)}`}>
            {level}
          </div>
        )}
      </div>

      {/* Message body */}
      <div class="cc-msg__body">
        <div class="cc-msg__header">
          {/* VIP badge */}
          {isPremium && premiumStyle === 'vip' && (
            <span class="cc-badge cc-badge--vip">{'\u2B50'} VIP</span>
          )}
          {/* MOD badge */}
          {isModerator && (
            <span class="cc-badge cc-badge--mod">MOD</span>
          )}
          {/* Streamer badge */}
          {isStreamer && (
            <span class="cc-badge cc-badge--streamer">
              {'\uD83C\uDFAC'} LIVE
            </span>
          )}

          {/* Username */}
          <span class={usernameClass} style={usernameColor ? { color: usernameColor } : undefined}>
            {displayName}
          </span>

          {/* Timestamp */}
          {createdAt && (
            <span class="cc-msg__time">{formatTime(createdAt)}</span>
          )}
        </div>

        {/* Reply quote */}
        {replyTo && (
          <div class="cc-reply-quote">
            <span class="cc-reply-quote__username">@{replyTo.username}</span>
            <span class="cc-reply-quote__text">{replyTo.text}</span>
          </div>
        )}

        {/* Message text with @mention parsing */}
        <div class="cc-msg__text">
          {textSegments.map((seg, i) =>
            seg.type === 'mention' ? (
              <span key={i} class="cc-mention">{seg.value}</span>
            ) : (
              seg.value
            )
          )}
        </div>

        {/* Reactions bar */}
        {(hasReactions || isLiked) && (
          <div class="cc-reactions">
            {((likes != null && likes > 0) || isLiked) && (
              <button
                class={`cc-reactions__like ${isLiked ? 'cc-reactions__like--active' : ''}`}
                onClick={() => onLike?.(message.id)}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={isLiked ? '#EF4444' : 'none'} stroke={isLiked ? '#EF4444' : 'currentColor'} stroke-width="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{(likes || 0) > 0 ? likes : isLiked ? 1 : ''}</span>
              </button>
            )}
            {reactionEntries.map(([emoji, count]) => (
              <span key={emoji} class="cc-reactions__pill">
                {emoji} {count}
              </span>
            ))}
            {isHovered && (
              <button class="cc-reactions__add">+</button>
            )}
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      {isHovered && (
        <div class="cc-msg__hover-actions">
          <button
            class={`cc-msg__hover-btn ${isLiked ? 'cc-msg__hover-btn--liked' : ''}`}
            title={isGuest ? 'Sign in to like' : 'Like'}
            onClick={() => { if (!isGuest) onLike?.(message.id); }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={isLiked ? '#EF4444' : 'none'} stroke={isLiked ? '#EF4444' : 'currentColor'} stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <button
            class="cc-msg__hover-btn"
            title={isGuest ? 'Sign in to reply' : 'Reply'}
            onClick={() => {
              if (!isGuest && onReply) {
                onReply({ id: message.id, username: displayName, text: text.slice(0, 100) });
              }
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            class="cc-msg__hover-btn cc-msg__hover-btn--tip"
            title={isGuest ? 'Sign in to tip' : 'Tip'}
            onClick={() => { if (!isGuest && message.playerId) onTip?.(message.playerId, displayName); }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <text x="12" y="16" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor" stroke="none">$</text>
            </svg>
          </button>
          <button
            class="cc-msg__hover-btn"
            title={isGuest ? 'Sign in to report' : 'Report'}
            onClick={() => {
              if (!isGuest) setShowReportDropdown((prev) => !prev);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </button>
        </div>
      )}

      {/* Report dropdown */}
      {showReportDropdown && (
        <div class="cc-report-dropdown" onClick={(e) => e.stopPropagation()}>
          <div class="cc-report-dropdown__title">Report message</div>
          {REPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              class="cc-report-dropdown__item"
              onClick={() => {
                if (onReport && message.playerId) {
                  onReport({
                    messageId: message.id,
                    playerId: message.playerId,
                    reason: reportReason || cat.label,
                    category: cat.value,
                  });
                }
                setShowReportDropdown(false);
                setReportReason('');
              }}
            >
              {cat.label}
            </button>
          ))}
          <input
            class="cc-report-dropdown__input"
            type="text"
            placeholder="Add reason (optional)..."
            value={reportReason}
            onInput={(e) => setReportReason((e.target as HTMLInputElement).value)}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            class="cc-report-dropdown__cancel"
            onClick={() => { setShowReportDropdown(false); setReportReason(''); }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
