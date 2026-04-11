import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import { Loader2, AlertCircle, Send, Hash, Users, RefreshCw, Smile, Trash2, Ban, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMOJI_LIST = [
  '😀','😂','🤣','😍','🥳','🎉','🎊','🍀','🔥','💰',
  '💎','🏆','👑','⭐','🎰','🎲','🃏','💯','👍','👎',
  '❤️','😎','🤑','💪','🙏','✅','❌','⚡','🌟','🎯',
  '😢','😡','🤔','🤯','🥶','🫡','🤝','👀','🎵','💀',
];

const BLOCK_DURATIONS = [
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '24 hours', minutes: 1440 },
  { label: '7 days', minutes: 10080 },
  { label: '30 days', minutes: 43200 },
  { label: 'Permanent', minutes: undefined },
];

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
  type: string;
  source: string;
  content: Record<string, any>;
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

function BlockPlayerModal({
  playerId,
  username,
  onClose,
  onConfirm,
}: {
  playerId: string;
  username: string;
  onClose: () => void;
  onConfirm: (playerId: string, reason: string, durationMinutes?: number) => void;
}) {
  const [reason, setReason] = useState('');
  const [durationIdx, setDurationIdx] = useState(2); // default 24h
  const backdropRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-[380px] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-text-primary">Block Player</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          Block <span className="text-red-400 font-semibold">{username}</span> from chatting.
        </p>
        <label className="block text-xs text-text-muted mb-1">Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Spam, toxic behavior..."
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
          autoFocus
        />
        <label className="block text-xs text-text-muted mb-1">Duration</label>
        <select
          value={durationIdx}
          onChange={(e) => setDurationIdx(Number(e.target.value))}
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
        >
          {BLOCK_DURATIONS.map((d, i) => (
            <option key={i} value={i}>{d.label}</option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary rounded-lg hover:bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(playerId, reason || 'Blocked by admin', BLOCK_DURATIONS[durationIdx].minutes)}
            className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
          >
            Block Player
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  onDelete,
  onBlock,
}: {
  msg: ChatMessage;
  onDelete?: (msg: ChatMessage) => void;
  onBlock?: (msg: ChatMessage) => void;
}) {
  const isSystem = msg.type === 'SYSTEM' || msg.source === 'SYSTEM';
  const isOperator = msg.source === 'OPERATOR';
  const isPlayer = msg.source === 'PLAYER';
  const username = (msg as any).username || msg.player?.username || (isOperator ? 'Admin' : 'System');

  const msgType = (msg.type || 'TEXT').toUpperCase();

  // System messages
  if (isSystem && msgType === 'SYSTEM') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-text-muted italic bg-page/50 px-3 py-1 rounded-full">
          {msg.content.text}
        </span>
      </div>
    );
  }

  // Rain event card
  if (msgType === 'RAIN') {
    return (
      <div className="mx-3 my-2 rounded-xl p-4 border border-purple-500/30" style={{ background: 'linear-gradient(135deg, #1E3A5F, #2D1B69)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🌧️</span>
          <div>
            <div className="text-sm font-bold text-white">RAIN EVENT</div>
            <div className="text-xs text-purple-300">
              {msg.content.initiator || 'Admin'} is raining {msg.content.amount || 0} {msg.content.currency || 'USD'} on chat!
            </div>
          </div>
        </div>
        <div className="text-xs text-purple-300/70">Duration: {msg.content.duration || 60}s</div>
      </div>
    );
  }

  // Trivia card
  if (msgType === 'TRIVIA') {
    const options = msg.content.options || [];
    return (
      <div className="mx-3 my-2 rounded-xl p-4 border border-amber-500/30" style={{ background: 'linear-gradient(135deg, rgba(217,119,6,0.15), #111827)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🧠</span>
          <span className="text-sm font-bold text-amber-400">CHAT TRIVIA</span>
        </div>
        <p className="text-sm text-text-primary mb-3">{msg.content.question}</p>
        <div className="grid grid-cols-2 gap-2">
          {options.map((opt: string, i: number) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-text-secondary">
              {String.fromCharCode(65 + i)}) {opt}
            </div>
          ))}
        </div>
        {msg.content.reward && (
          <div className="text-xs text-amber-400/70 mt-2">Reward: {msg.content.reward}</div>
        )}
      </div>
    );
  }

  // Promo card
  if (msgType === 'PROMO') {
    return (
      <div className="mx-3 my-2 rounded-xl p-4 border-l-4" style={{ borderLeftColor: msg.content.accentColor || '#EF4444', background: '#111827' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{msg.content.emoji || '🎉'}</span>
          <span className="text-sm font-bold text-text-primary">{msg.content.title}</span>
        </div>
        {msg.content.subtitle && <p className="text-xs text-text-secondary mb-1">{msg.content.subtitle}</p>}
        {msg.content.detailText && <p className="text-xs text-text-muted">{msg.content.detailText}</p>}
        {msg.content.ctaText && (
          <div className="mt-2">
            <span className="text-xs font-bold px-3 py-1 rounded" style={{ backgroundColor: msg.content.accentColor || '#EF4444', color: 'white' }}>
              {msg.content.ctaText}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Win card
  if (msgType === 'WIN') {
    return (
      <div className="mx-3 my-2 rounded-xl p-4 border-l-4 border-green-500" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), #111827)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-green-400">{username}</span>
          <span className="text-xs text-text-muted">won on {msg.content.game || 'Casino'}</span>
        </div>
        {msg.content.win != null && (
          <div className="text-lg font-bold text-white">{msg.content.currency || '$'}{msg.content.win}</div>
        )}
        {msg.content.text && !msg.content.win && (
          <p className="text-sm text-green-300">{msg.content.text}</p>
        )}
      </div>
    );
  }

  // Default: text message
  const color = colorFromName(username);

  return (
    <div className="flex items-start gap-2.5 px-4 py-1.5 hover:bg-white/[0.02] transition-colors group relative">
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

      {/* Hover actions — only for player messages */}
      {isPlayer && (onDelete || onBlock) && (
        <div className="absolute right-3 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
          {onDelete && (
            <button
              onClick={() => onDelete(msg)}
              className="p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
              title="Delete message"
            >
              <Trash2 size={13} />
            </button>
          )}
          {onBlock && msg.playerId && (
            <button
              onClick={() => onBlock(msg)}
              className="p-1 rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
              title="Block player"
            >
              <Ban size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-lg shadow-xl p-2 z-50 w-[280px]"
    >
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover text-lg transition-colors"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
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
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? text.length;
      const end = input.selectionEnd ?? text.length;
      const newText = text.slice(0, start) + emoji + text.slice(end);
      setText(newText);
      // Set cursor position after the emoji on next tick
      requestAnimationFrame(() => {
        const pos = start + emoji.length;
        input.setSelectionRange(pos, pos);
        input.focus();
      });
    } else {
      setText((prev) => prev + emoji);
    }
  };

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            disabled={disabled}
            className="text-text-muted hover:text-text-primary disabled:opacity-50 p-2 rounded-lg hover:bg-hover transition-colors"
            title="Emoji picker"
          >
            <Smile size={18} />
          </button>
          {showEmoji && (
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmoji(false)}
            />
          )}
        </div>
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

  // Block modal
  const [blockTarget, setBlockTarget] = useState<{ playerId: string; username: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, []);

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
  // Delete message
  // -----------------------------------------------------------------------
  const handleDeleteMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!tenantId) return;
      try {
        await api.delete(`/tenants/${tenantId}/channels/${msg.channelId}/messages/${msg.id}`);
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
        showToast('Message deleted');
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to delete message';
        showToast(`Error: ${errMsg}`);
      }
    },
    [tenantId, showToast],
  );

  // -----------------------------------------------------------------------
  // Block player
  // -----------------------------------------------------------------------
  const handleBlockPlayer = useCallback(
    async (playerId: string, reason: string, durationMinutes?: number) => {
      try {
        await api.post(`/moderation/actions/${playerId}`, {
          action: 'BAN',
          reason,
          ...(durationMinutes != null ? { durationMinutes } : {}),
        });
        setBlockTarget(null);
        showToast('Player blocked successfully');
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message || 'Failed to block player';
        showToast(`Error: ${errMsg}`);
      }
    },
    [showToast],
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
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    onDelete={handleDeleteMessage}
                    onBlock={(m) => {
                      if (m.playerId && m.player?.username) {
                        setBlockTarget({ playerId: m.playerId, username: m.player.username });
                      }
                    }}
                  />
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

      {/* Block player modal */}
      {blockTarget && (
        <BlockPlayerModal
          playerId={blockTarget.playerId}
          username={blockTarget.username}
          onClose={() => setBlockTarget(null)}
          onConfirm={handleBlockPlayer}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-card border border-border rounded-lg shadow-xl px-4 py-2.5 z-50 text-sm text-text-primary animate-fade-in">
          {toast}
        </div>
      )}
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
