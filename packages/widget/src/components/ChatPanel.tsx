import { h } from 'preact';
import type { ChatConfig, ChatMessage, Channel, Player } from '../types';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export interface ChatPanelProps {
  config: ChatConfig;
  isConnected: boolean;
  isGuest: boolean;
  player: Player | null;
  messages: ChatMessage[];
  channels: Channel[];
  currentChannel: string | null;
  onlineCount: number;
  onJoinChannel: (id: string) => void;
  onSendMessage: (text: string) => void;
  onClose?: () => void;
}

export function ChatPanel({
  config,
  isConnected,
  isGuest,
  player,
  messages,
  channels,
  currentChannel,
  onlineCount,
  onJoinChannel,
  onSendMessage,
  onClose,
}: ChatPanelProps) {
  const mode = config.mode || 'floating';
  const primaryColor = config.theme?.primaryColor || '#6366F1';

  const currentChannelObj = channels.find((ch) => ch.id === currentChannel);

  return (
    <div class={`cc-panel cc-panel--${mode}`}>
      <ChatHeader
        isConnected={isConnected}
        onlineCount={onlineCount}
        channels={channels}
        currentChannel={currentChannelObj || null}
        onChannelSelect={onJoinChannel}
        onClose={onClose}
      />
      <MessageList
        messages={messages}
        currentPlayer={player}
        isGuest={isGuest}
      />
      <ChatInput
        isGuest={isGuest}
        onSend={onSendMessage}
        primaryColor={primaryColor}
        onlineCount={onlineCount}
      />
    </div>
  );
}
