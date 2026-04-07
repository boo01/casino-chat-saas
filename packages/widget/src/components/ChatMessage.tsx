import { h } from 'preact';
import type { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
}

const VIP_COLORS: Record<string, string> = {
  DIAMOND: '#B9F2FF',
  PLATINUM: '#E5E4E2',
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
  BRONZE: '#CD7F32',
};

export function ChatMessageItem({ message, isOwn }: Props) {
  const isSystem = message.type === 'SYSTEM' || message.type === 'WIN' || message.type === 'RAIN';
  const text = message.content?.text || '';

  if (isSystem) {
    return (
      <div class={`cc-msg cc-msg--system cc-msg--${message.type.toLowerCase()}`}>
        <span class="cc-msg__text">{text}</span>
      </div>
    );
  }

  const vipColor = message.vipStatus ? VIP_COLORS[message.vipStatus] : undefined;

  return (
    <div class={`cc-msg ${isOwn ? 'cc-msg--own' : ''}`}>
      <div class="cc-msg__avatar">
        {message.avatarUrl ? (
          <img src={message.avatarUrl} alt="" class="cc-msg__avatar-img" />
        ) : (
          <div class="cc-msg__avatar-placeholder">{(message.username || '?')[0]}</div>
        )}
      </div>
      <div class="cc-msg__body">
        <div class="cc-msg__header">
          <span
            class={`cc-msg__username ${message.isPremium ? `cc-msg__username--${(message.premiumStyle || 'none').toLowerCase()}` : ''}`}
            style={vipColor ? { color: vipColor } : undefined}
          >
            {message.isModerator && <span class="cc-badge cc-badge--mod">MOD</span>}
            {message.isStreamer && <span class="cc-badge cc-badge--streamer">LIVE</span>}
            {message.username || 'Anonymous'}
          </span>
          {message.level && <span class="cc-msg__level">Lv.{message.level}</span>}
        </div>
        <div class="cc-msg__text">{text}</div>
      </div>
    </div>
  );
}
