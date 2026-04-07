import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { ChatMessage, Player } from '../types';
import { ChatMessageItem } from './ChatMessage';

interface Props {
  messages: ChatMessage[];
  currentPlayer: Player | null;
}

export function MessageList({ messages, currentPlayer }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  return (
    <div class="cc-messages">
      {messages.length === 0 && (
        <div class="cc-messages__empty">No messages yet. Start the conversation!</div>
      )}
      {messages.map((msg) => (
        <ChatMessageItem key={msg.id} message={msg} isOwn={msg.playerId === currentPlayer?.id} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
