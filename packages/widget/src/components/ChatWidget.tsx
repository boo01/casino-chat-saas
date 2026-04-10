import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import type { ChatConfig, ChatMessage, Channel, Player } from '../types';
import { ChatSocket } from '../api/socket';
import { ChatPanel } from './ChatPanel';

interface Props {
  config: ChatConfig;
}

export function ChatWidget({ config }: Props) {
  const mode = config.mode || 'floating';
  const [isOpen, setIsOpen] = useState(mode !== 'floating' || config.defaultOpen === true);
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
      if (data.channels) {
        setChannels(data.channels);
        // Auto-join first channel (or defaultChannel from config)
        const targetChannel = config.defaultChannel
          ? data.channels.find((ch: any) => ch.id === config.defaultChannel || ch.name === config.defaultChannel)
          : data.channels[0];
        if (targetChannel) {
          socket.joinChannel(targetChannel.id);
        }
      }
    };

    socket.onChannelJoined = (data) => {
      // Sort oldest first (Redis cache may return inconsistent order)
      const msgs = [...(data.messages || [])].sort(
        (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(msgs);
      setOnlineCount(data.onlineCount || 0);
      setCurrentChannel(data.channelId);
      if (data.channel) {
        setChannels((prev) => {
          const exists = prev.some((ch) => ch.id === data.channel.id);
          return exists ? prev : [...prev, data.channel];
        });
      }
    };

    socket.onMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.onPlayerJoined = (data) => {
      if (data.onlineCount != null) setOnlineCount(data.onlineCount);
    };

    socket.onPlayerLeft = (data) => {
      if (data.onlineCount != null) setOnlineCount(data.onlineCount);
    };

    socket.onError = (err) => {
      console.warn('[CasinoChat] Error:', err);
    };

    socket.onDisconnect = () => {
      setIsConnected(false);
    };

    // For sidebar/fullscreen, connect immediately
    if (mode !== 'floating' || config.defaultOpen) {
      socket.connect();
    }

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

  // Sidebar mode: fill parent container
  if (mode === 'sidebar') {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <ChatPanel
          config={config}
          isConnected={isConnected}
          isGuest={isGuest}
          player={player}
          messages={messages}
          channels={channels}
          currentChannel={currentChannel}
          onlineCount={onlineCount}
          onJoinChannel={handleJoinChannel}
          onSendMessage={handleSend}
        />
      </div>
    );
  }

  // Fullscreen mode: fill viewport
  if (mode === 'fullscreen') {
    return (
      <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 999999 }}>
        <ChatPanel
          config={config}
          isConnected={isConnected}
          isGuest={isGuest}
          player={player}
          messages={messages}
          channels={channels}
          currentChannel={currentChannel}
          onlineCount={onlineCount}
          onJoinChannel={handleJoinChannel}
          onSendMessage={handleSend}
        />
      </div>
    );
  }

  // Floating mode: FAB + panel
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

  const floatingStyle: Record<string, string> = {
    width: `${width}px`,
    height: `${height}px`,
  };

  if (position === 'bottom-right') {
    floatingStyle.bottom = '84px';
    floatingStyle.right = '20px';
  } else {
    floatingStyle.bottom = '84px';
    floatingStyle.left = '20px';
  }

  return (
    <div>
      <div style={floatingStyle} class="cc-panel--floating">
        <ChatPanel
          config={config}
          isConnected={isConnected}
          isGuest={isGuest}
          player={player}
          messages={messages}
          channels={channels}
          currentChannel={currentChannel}
          onlineCount={onlineCount}
          onJoinChannel={handleJoinChannel}
          onSendMessage={handleSend}
          onClose={handleOpen}
        />
      </div>
      <div
        class={`cc-fab cc-fab--${position}`}
        onClick={handleOpen}
        style={{ backgroundColor: primaryColor }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    </div>
  );
}
