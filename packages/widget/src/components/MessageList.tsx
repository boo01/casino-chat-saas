import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { ChatMessage as ChatMessageType, Player } from '../types';
import { ChatMessageItem } from './ChatMessage';

interface Props {
  messages: ChatMessageType[];
  currentPlayer: Player | null;
}

export function MessageList({ messages, currentPlayer }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Track whether user has scrolled up
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 60;
    shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  useEffect(() => {
    if (shouldAutoScroll.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div class="cc-messages">
        <div class="cc-messages__empty">
          <span class="cc-messages__empty-icon">💬</span>
          <span>No messages yet. Start the conversation!</span>
        </div>
      </div>
    );
  }

  return (
    <div class="cc-messages" ref={containerRef} onScroll={handleScroll}>
      {messages.map((msg) => {
        const isOwn = msg.playerId === currentPlayer?.id;

        switch (msg.type) {
          case 'system':
            return (
              <div key={msg.id} class="cc-msg cc-msg--system">
                <span class="cc-msg__text">{msg.content?.text || ''}</span>
              </div>
            );

          case 'win':
            return (
              <div key={msg.id} class="cc-win-card">
                <span class="cc-win-card__icon">{msg.content?.gameIcon || '🎰'}</span>
                <div class="cc-win-card__info">
                  <div class="cc-win-card__player">
                    {msg.username || 'Player'} won!
                  </div>
                  <div class="cc-win-card__game">
                    {msg.content?.game || 'Casino Game'}
                  </div>
                </div>
                <div>
                  <div class="cc-win-card__amount">
                    {msg.content?.currency || '$'}{msg.content?.win?.toLocaleString() || '0'}
                  </div>
                  {msg.content?.multiplier && (
                    <div class="cc-win-card__multiplier">
                      {msg.content.multiplier}x
                    </div>
                  )}
                </div>
              </div>
            );

          case 'tip':
            return (
              <div key={msg.id} class="cc-msg cc-msg--tip">
                <div class="cc-msg__body">
                  <span class="cc-msg__text">
                    💰 <strong>{msg.content?.fromPlayer || 'Someone'}</strong> tipped{' '}
                    <strong>{msg.content?.toPlayer || 'someone'}</strong>{' '}
                    {msg.content?.tipCurrency || '$'}{msg.content?.tipAmount || 0}
                  </span>
                </div>
              </div>
            );

          case 'rain':
            return (
              <div key={msg.id} class="cc-rain-card">
                <div class="cc-rain-card__title">🌧 Rain Event</div>
                <div class="cc-rain-card__amount">
                  {msg.content?.currency || '$'}{msg.content?.amount?.toLocaleString() || '0'}
                </div>
                {msg.content?.timeLeft != null && msg.content.timeLeft > 0 && (
                  <div class="cc-rain-card__countdown">
                    {msg.content.timeLeft}s remaining
                  </div>
                )}
              </div>
            );

          case 'trivia':
            return (
              <div key={msg.id} class="cc-trivia-card">
                <div class="cc-trivia-card__question">
                  🧠 {msg.content?.question || 'Trivia Question'}
                </div>
                {msg.content?.options && (
                  <div class="cc-trivia-card__options">
                    {msg.content.options.map((opt, i) => (
                      <div key={i} class="cc-trivia-card__option">{opt}</div>
                    ))}
                  </div>
                )}
              </div>
            );

          case 'promo':
            return (
              <div key={msg.id} class="cc-promo-card">
                <div class="cc-promo-card__title">
                  {msg.content?.emoji || '🎁'} {msg.content?.title || 'Promotion'}
                </div>
                {msg.content?.subtitle && (
                  <div class="cc-promo-card__subtitle">{msg.content.subtitle}</div>
                )}
                {msg.content?.ctaText && (
                  <a
                    class="cc-promo-card__cta"
                    href={msg.content?.ctaUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {msg.content.ctaText}
                  </a>
                )}
              </div>
            );

          case 'text':
          default:
            return (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                isOwn={isOwn}
              />
            );
        }
      })}
      <div ref={endRef} />
    </div>
  );
}
