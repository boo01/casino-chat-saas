import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import { Loader2, AlertCircle, Send, Hash, Users, RefreshCw } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Channel {
  id: string;
  tenantId: string;
  name: string;
  emoji: string;
  language: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

interface MessagePlayer {
  username: string;
  level: number;
  vipStatus: string;
  avatarUrl: string | null;
  isModerator: boolean;
}

interface ChatMessage {
  id: string;
  tenantId: string;
  channelId: string;
  playerId: string | null;
  type: 'TEXT' | 'SYSTEM' | 'WIN' | 'RAIN';
  source: 'PLAYER' | 'OPERATOR' | 'SYSTEM';
  content: { text: string };
  player?: MessagePlayer;
  createdAt: string;
  sequenceNum: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ChannelSidebar({
  channels,
  activeChannelId,
  onSelect,
  loading,
}: {
  channels: Channel[];
  activeChannelId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="w-[220px] min-w-[220px] bg-card border-r border-border flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Hash size={14} />
          Channels
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-text-muted" />
          </div>
        ) : channels.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-6">No channels</p>
        ) : (
          channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 flex items-center gap-2 ${
                activeChannelId === ch.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-text-secondary hover:bg-hover hover:text-text-primary'
              }`}
            >
              <span className="text-base leading-none">{ch.emoji}</span>
              <span className="truncate">{ch.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isSystem = msg.type === 'SYSTEM' || msg.source === 'SYSTEM';
  const isOperator = msg.source === 'OPERATOR';
  const username = msg.player?.username ?? (isOperator ? 'Admin' : 'System');

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-text-muted italic bg-page/50 px-3 py-1 rounded-full">
          {msg.content.text}
        </span>
      </div>
    );
  }

  const color = colorFromName(username);

  return (
    <div className="flex items-start gap-2.5 px-4 py-1.5 hover:bg-white/[0.02] transition-colors group">
      {/* Avatar */}
      {msg.player?.avatarUrl ? (
        <img
          src={msg.player.avatarUrl}
          alt={username}
          className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
          style={{ backgroundColor: color }}
        >
          {getInitials(username)}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-text-primary">{username}</span>
          {isOperator && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.5 rounded">
              Admin
            </span>
          )}
          {msg.player?.isModerator && !isOperator && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-green-600 text-white px-1.5 py-0.5 rounded">
              Mod
            </span>
          )}
          <span className="text-[11px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(msg.createdAt)}
          </span>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed break-words">
          {msg.content.text}
        </p>
      </div>
    </div>
  );
}

function MessageInput({
  onSend,
  disabled,
  adminName,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
  adminName: string;
}) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled}
          className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
          title="Send message"
        >
          <Send size={18} />
        </button>
      </div>
      <p className="text-[11px] text-text-muted mt-1.5">
        Sending as <span className="text-indigo-400 font-medium">{adminName}</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 3000;
const MESSAGE_LIMIT = 100;

export function LiveChatPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  // Channels
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  // Active channel + messages
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Sending
  const [isSending, setIsSending] = useState(false);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Track whether user is scrolled to bottom
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 80;
    shouldAutoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback((instant?: boolean) => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
    }
  }, []);

  // -----------------------------------------------------------------------
  // Fetch channels
  // -----------------------------------------------------------------------
  const fetchChannels = useCallback(async () => {
    setChannelsLoading(true);
    setChannelsError(null);
    try {
      const res = await api.get<Channel[]>('/channels');
      const active = res.data.filter((ch) => ch.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
      setChannels(active);
      // Auto-select first channel if nothing selected
      if (active.length > 0) {
        setActiveChannelId((prev) => {
          if (prev && active.some((ch) => ch.id === prev)) return prev;
          return active[0].id;
        });
      }
    } catch (err: any) {
      setChannelsError(err.response?.data?.message || err.message || 'Failed to load channels');
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // -----------------------------------------------------------------------
  // Fetch messages for active channel
  // -----------------------------------------------------------------------
  const fetchMessages = useCallback(
    async (channelId: string, isPolling = false) => {
      if (!tenantId) return;
      if (!isPolling) setMessagesLoading(true);
      setMessagesError(null);
      try {
        const res = await api.get<ChatMessage[]>(
          `/tenants/${tenantId}/channels/${channelId}/messages?limit=${MESSAGE_LIMIT}`,
        );
        // Sort oldest first (API may return inconsistent order from Redis vs DB)
        const sorted = [...res.data].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setMessages(sorted);
      } catch (err: any) {
        if (!isPolling) {
          setMessagesError(err.response?.data?.message || err.message || 'Failed to load messages');
        }
      } finally {
        if (!isPolling) setMessagesLoading(false);
      }
    },
    [tenantId],
  );

  // Load messages on channel switch
  useEffect(() => {
    if (!activeChannelId) return;
    shouldAutoScroll.current = true;
    isFirstLoad.current = true;
    fetchMessages(activeChannelId);
  }, [activeChannelId, fetchMessages]);

  // Poll for new messages
  useEffect(() => {
    if (!activeChannelId) return;
    const interval = setInterval(() => {
      fetchMessages(activeChannelId, true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeChannelId, fetchMessages]);

  // Auto-scroll when messages change (instant on first load, smooth on updates)
  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(isFirstLoad.current);
      isFirstLoad.current = false;
    }
  }, [messages, scrollToBottom]);

  // -----------------------------------------------------------------------
  // Send message
  // -----------------------------------------------------------------------
  const handleSend = useCallback(
    async (text: string) => {
      if (!tenantId || !activeChannelId) return;
      setIsSending(true);
      try {
        await api.post(`/tenants/${tenantId}/channels/${activeChannelId}/messages`, {
          text,
          type: 'TEXT',
          source: 'OPERATOR',
        });
        shouldAutoScroll.current = true;
        // Immediately refresh to show new message
        await fetchMessages(activeChannelId, true);
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to send message';
        console.error('Send message error:', msg);
      } finally {
        setIsSending(false);
      }
    },
    [tenantId, activeChannelId, fetchMessages],
  );

  // -----------------------------------------------------------------------
  // Active channel object
  // -----------------------------------------------------------------------
  const activeChannel = channels.find((ch) => ch.id === activeChannelId) ?? null;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] gap-3">
        <AlertCircle size={24} className="text-yellow-400" />
        <p className="text-sm text-text-muted">
          Live Chat is only available for tenant admins.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] -m-6">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Live Chat</h2>
          <p className="text-xs text-text-muted">
            Monitor and send messages in real-time
          </p>
        </div>
        <button
          onClick={() => {
            fetchChannels();
            if (activeChannelId) fetchMessages(activeChannelId);
          }}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1 rounded hover:bg-hover"
          title="Refresh"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Channel sidebar */}
        <ChannelSidebar
          channels={channels}
          activeChannelId={activeChannelId}
          onSelect={setActiveChannelId}
          loading={channelsLoading}
        />

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          {activeChannel ? (
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/50">
              <span className="text-lg">{activeChannel.emoji}</span>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{activeChannel.name}</h3>
                {activeChannel.description && (
                  <p className="text-[11px] text-text-muted truncate max-w-md">
                    {activeChannel.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center px-4 py-2.5 border-b border-border bg-card/50">
              <span className="text-sm text-text-muted">Select a channel</span>
            </div>
          )}

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto bg-page"
          >
            {channelsError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle size={20} className="text-red-400" />
                <p className="text-sm text-red-400">{channelsError}</p>
                <button
                  onClick={fetchChannels}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : !activeChannelId ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
                <Hash size={32} className="opacity-30" />
                <p className="text-sm">Select a channel to start monitoring</p>
              </div>
            ) : messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
              </div>
            ) : messagesError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <AlertCircle size={20} className="text-red-400" />
                <p className="text-sm text-red-400">{messagesError}</p>
                <button
                  onClick={() => activeChannelId && fetchMessages(activeChannelId)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted">
                <MessageBubblePlaceholder />
                <p className="text-sm">No messages yet in this channel</p>
                <p className="text-xs">Be the first to send a message</p>
              </div>
            ) : (
              <div className="py-2">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <MessageInput
            onSend={handleSend}
            disabled={isSending || !activeChannelId}
            adminName={user?.name || user?.email || 'Admin'}
          />
        </div>
      </div>
    </div>
  );
}

// Small placeholder icon for empty state
function MessageBubblePlaceholder() {
  return (
    <div className="w-12 h-12 rounded-xl bg-card/60 flex items-center justify-center">
      <Users size={20} className="text-text-muted opacity-40" />
    </div>
  );
}
