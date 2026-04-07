import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import type { ChatConfig, ChatMessage, Channel, Player } from '../types';
import { ChatSocket } from '../api/socket';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface Props {
  config: ChatConfig;
}

export function ChatWidget({ config }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [player, setPlayer] = useState<Player | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef<ChatSocket | null>(null);

  useEffect(() => {
    const socket = new ChatSocket(config);
    socketRef.current = socket;

    socket.onConnected = (data) => {
      setIsConnected(true);
      setIsGuest(data.isGuest);
      if (data.player) setPlayer(data.player);
    };

    socket.onChannelJoined = (data) => {
      setMessages(data.messages || []);
      setOnlineCount(data.onlineCount || 0);
      setCurrentChannel(data.channelId);
    };

    socket.onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.onError = (err) => {
      console.warn('[CasinoChat] Error:', err);
    };

    socket.onDisconnect = () => {
      setIsConnected(false);
    };

    return () => socket.disconnect();
  }, [config.tenantId, config.playerToken]);

  const handleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
      if (!socketRef.current?.isConnected) {
        socketRef.current?.connect();
      }
    } else {
      setIsOpen(false);
    }
  };

  const handleJoinChannel = (channelId: string) => {
    if (currentChannel) {
      socketRef.current?.leaveChannel(currentChannel);
    }
    socketRef.current?.joinChannel(channelId);
  };

  const handleSend = (text: string) => {
    if (currentChannel && socketRef.current) {
      socketRef.current.sendMessage(currentChannel, text);
    }
  };

  const position = config.theme?.position || 'bottom-right';
  const width = config.theme?.width || 380;
  const height = config.theme?.height || 600;
  const primaryColor = config.theme?.primaryColor || '#6366F1';

  if (!isOpen) {
    return (
      <div
        class={`cc-fab cc-fab--${position}`}
        onClick={handleOpen}
        style={{ backgroundColor: primaryColor }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      class={`cc-widget cc-widget--${position}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <ChatHeader
        isConnected={isConnected}
        onlineCount={onlineCount}
        channelName={currentChannel || 'Chat'}
        primaryColor={primaryColor}
        onClose={handleOpen}
        onChannelSelect={handleJoinChannel}
      />
      <MessageList messages={messages} currentPlayer={player} />
      <ChatInput
        isGuest={isGuest}
        onSend={handleSend}
        primaryColor={primaryColor}
      />
    </div>
  );
}
