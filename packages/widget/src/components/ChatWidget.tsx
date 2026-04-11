import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { ChatConfig, ChatMessage, Channel, Player, ReplyRef } from '../types';
import { ChatSocket } from '../api/socket';
import { ChatPanel } from './ChatPanel';
import { TipModal } from './TipModal';

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
  const [errorState, setErrorState] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [tipTarget, setTipTarget] = useState<{ id: string; username: string } | null>(null);
  const [tipCurrencies, setTipCurrencies] = useState<Array<{ code: string; name: string; symbol: string; type: string }>>([]);
  const [tipLoading, setTipLoading] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);
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
      // Preload tip currencies
      socket.requestCurrencies();
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
      if (err?.code === 'TENANT_SUSPENDED' || err?.code === 'MISSING_TENANT') {
        setErrorState(err.message || 'Chat is temporarily disabled');
        socket.disconnect(); // Stop reconnection attempts
      }
    };

    socket.onMessageLiked = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, likes: data.likesCount } : msg,
        ),
      );
      // Track if the current player liked/unliked
      if (data.action === 'liked') {
        setLikedMessages((prev) => new Set(prev).add(data.messageId));
      } else {
        setLikedMessages((prev) => {
          const next = new Set(prev);
          next.delete(data.messageId);
          return next;
        });
      }
    };

    socket.onReportSubmitted = () => {
      showToast('Report submitted');
    };

    socket.onTipCurrencies = (data) => {
      if (data?.currencies) setTipCurrencies(data.currencies);
    };

    socket.onTipSuccess = () => {
      setTipLoading(false);
      setTipTarget(null);
      setTipError(null);
      showToast('Tip sent!');
    };

    socket.onTipFailed = (data) => {
      setTipLoading(false);
      setTipError(data?.reason || 'Tip failed');
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
      socketRef.current.sendMessage(currentChannel, text, replyTo?.id);
      setReplyTo(null);
    }
  };

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleLike = useCallback((messageId: string) => {
    if (isGuest || !currentChannel) return;
    socketRef.current?.likeMessage(messageId, currentChannel);
    // Optimistic toggle
    setLikedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, [isGuest, currentChannel]);

  const handleReply = useCallback((ref: ReplyRef) => {
    if (isGuest) return;
    setReplyTo(ref);
  }, [isGuest]);

  const handleClearReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleTip = useCallback((playerId: string, username: string) => {
    if (isGuest) return;
    setTipTarget({ id: playerId, username });
    setTipError(null);
    setTipLoading(false);
  }, [isGuest]);

  const handleTipSend = useCallback((data: { targetPlayerId: string; amount: number; currency: string; isPublic: boolean }) => {
    if (!currentChannel || !socketRef.current) return;
    setTipLoading(true);
    setTipError(null);
    socketRef.current.sendTip({
      targetPlayerId: data.targetPlayerId,
      amount: data.amount,
      currency: data.currency,
      channelId: currentChannel,
      isPublic: data.isPublic,
    });
  }, [currentChannel]);

  const handleTipClose = useCallback(() => {
    setTipTarget(null);
    setTipError(null);
    setTipLoading(false);
  }, []);

  const handleReport = useCallback((data: { messageId: string; playerId: string; reason: string; category: string }) => {
    if (isGuest) return;
    socketRef.current?.reportMessage(data);
  }, [isGuest]);

  const position = config.theme?.position || 'bottom-right';
  const width = config.theme?.width || 380;
  const height = config.theme?.height || 600;
  const primaryColor = config.theme?.primaryColor || '#6366F1';

  // Show error state (e.g. tenant suspended)
  if (errorState) {
    const errorContent = (
      <div class="cc-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0d121d' }}>
        <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#F9FAFB', marginBottom: '8px' }}>Chat Unavailable</div>
          <div style={{ fontSize: '13px' }}>{errorState}</div>
        </div>
      </div>
    );

    if (mode === 'fullscreen') {
      return <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0 }}>{errorContent}</div>;
    }
    if (mode === 'sidebar') {
      return <div style={{ width: '100%', height: '100%' }}>{errorContent}</div>;
    }
    // floating — don't show anything (no bubble)
    return null;
  }

  // TipModal element (reused across modes)
  const tipModal = tipTarget && (
    <TipModal
      targetPlayer={tipTarget}
      onClose={handleTipClose}
      onSend={handleTipSend}
      currencies={tipCurrencies}
      isLoading={tipLoading}
      error={tipError}
    />
  );

  // Sidebar mode: fill parent container
  if (mode === 'sidebar') {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {toast && <div class="cc-toast">{toast}</div>}
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
          onLike={handleLike}
          onReply={handleReply}
          onTip={handleTip}
          onReport={handleReport}
          replyTo={replyTo}
          onClearReply={handleClearReply}
          likedMessages={likedMessages}
        />
        {tipModal}
      </div>
    );
  }

  // Fullscreen mode: fill viewport
  if (mode === 'fullscreen') {
    return (
      <div style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 999999 }}>
        {toast && <div class="cc-toast">{toast}</div>}
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
          onLike={handleLike}
          onReply={handleReply}
          onTip={handleTip}
          onReport={handleReport}
          replyTo={replyTo}
          onClearReply={handleClearReply}
          likedMessages={likedMessages}
        />
        {tipModal}
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
      {toast && <div class="cc-toast">{toast}</div>}
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
          onLike={handleLike}
          onReply={handleReply}
          onTip={handleTip}
          onReport={handleReport}
          replyTo={replyTo}
          onClearReply={handleClearReply}
          likedMessages={likedMessages}
        />
        {tipModal}
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
