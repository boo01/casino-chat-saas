import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { ChatMessage as ChatMessageType, Player, ReplyRef } from '../types';
import { ChatMessageItem } from './ChatMessage';
import { WinCard } from './WinCard';
import { RainEvent } from './RainEvent';
import { TriviaCard } from './TriviaCard';
import { PromoCard } from './PromoCard';

interface Props {
  messages: ChatMessageType[];
  currentPlayer: Player | null;
  isGuest?: boolean;
  onLike?: (messageId: string) => void;
  onReply?: (ref: ReplyRef) => void;
  onTip?: (playerId: string, username: string) => void;
  onReport?: (data: { messageId: string; playerId: string; reason: string; category: string }) => void;
  likedMessages?: Set<string>;
}

export function MessageList({ messages, currentPlayer, isGuest, onLike, onReply, onTip, onReport, likedMessages }: Props) {
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
          <span class="cc-messages__empty-icon">{'\uD83D\uDCAC'}</span>
          <span>No messages yet. Start the conversation!</span>
        </div>
      </div>
    );
  }

  return (
    <div class="cc-messages" ref={containerRef} onScroll={handleScroll}>
      {messages.map((msg) => {
        const isOwn = msg.playerId === currentPlayer?.id;

        const msgType = (msg.type || 'text').toLowerCase();

        switch (msgType) {
          case 'system':
            return (
              <div key={msg.id} class="cc-msg cc-msg--system">
                <span class="cc-msg__text">{msg.content?.text || ''}</span>
              </div>
            );

          case 'win':
            return <WinCard key={msg.id} message={msg} isGuest={isGuest} />;

          case 'rain':
            return <RainEvent key={msg.id} message={msg} isGuest={isGuest} />;

          case 'trivia':
            return <TriviaCard key={msg.id} message={msg} isGuest={isGuest} />;

          case 'promo':
            return <PromoCard key={msg.id} message={msg} isGuest={isGuest} />;

          case 'tip':
            return (
              <div key={msg.id} class="cc-msg cc-msg--tip">
                <div class="cc-msg__body">
                  <span class="cc-msg__text">
                    {'\uD83D\uDCB0'} <strong>{msg.content?.fromPlayer || 'Someone'}</strong> tipped{' '}
                    <strong>{msg.content?.toPlayer || 'someone'}</strong>{' '}
                    {msg.content?.tipCurrency || '$'}{msg.content?.tipAmount || 0}
                  </span>
                </div>
              </div>
            );

          case 'text':
          default:
            return (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                isGuest={isGuest}
                isLiked={likedMessages?.has(msg.id) || false}
                onLike={onLike}
                onReply={onReply}
                onTip={onTip}
                onReport={onReport}
              />
            );
        }
      })}
      <div ref={endRef} />
    </div>
  );
}
