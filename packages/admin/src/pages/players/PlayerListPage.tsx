import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../../api/client';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ShieldBan,
  ShieldCheck,
  Users,
  Crown,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VipStatus = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

interface Player {
  id: string;
  tenantId: string;
  externalId: string;
  username: string;
  avatarUrl: string | null;
  level: number;
  vipStatus: VipStatus;
  isPremium: boolean;
  premiumStyle: string | null;
  isModerator: boolean;
  isStreamer: boolean;
  totalWagered: string;
  favoriteGame: string | null;
  winCount: number;
  lastSeenAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VIP_BADGE_STYLES: Record<VipStatus, { bg: string; text: string; border: string }> = {
  DIAMOND:  { bg: 'bg-cyan-500/15',   text: 'text-[#06B6D4]', border: 'border-cyan-500/30' },
  PLATINUM: { bg: 'bg-gray-400/15',   text: 'text-[#9CA3AF]', border: 'border-gray-400/30' },
  GOLD:     { bg: 'bg-yellow-500/15', text: 'text-[#EAB308]', border: 'border-yellow-500/30' },
  SILVER:   { bg: 'bg-gray-500/15',   text: 'text-[#6B7280]', border: 'border-gray-500/30' },
  BRONZE:   { bg: 'bg-orange-500/15', text: 'text-[#F97316]', border: 'border-orange-500/30' },
  NONE:     { bg: 'bg-gray-700/15',   text: 'text-[#374151]', border: 'border-gray-700/30' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString();
}

function playerInitials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function VipBadge({ status }: { status: VipStatus }) {
  const style = VIP_BADGE_STYLES[status] ?? VIP_BADGE_STYLES.NONE;
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}
    >
      {status === 'NONE' ? '—' : status}
    </span>
  );
}

function PlayerAvatar({ player }: { player: Player }) {
  const vipStyle = VIP_BADGE_STYLES[player.vipStatus] ?? VIP_BADGE_STYLES.NONE;
  if (player.avatarUrl) {
    return (
      <img
        src={player.avatarUrl}
        alt={player.username}
        className={`w-8 h-8 rounded-full border ${vipStyle.border} object-cover`}
      />
    );
  }
  return (
    <div
      className={`w-8 h-8 rounded-full border ${vipStyle.border} ${vipStyle.bg} flex items-center justify-center text-xs font-bold ${vipStyle.text}`}
    >
      {playerInitials(player.username)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block Modal
// ---------------------------------------------------------------------------

const BLOCK_DURATIONS = [
  { label: '1 hour', hours: 1 },
  { label: '6 hours', hours: 6 },
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 168 },
  { label: '30 days', hours: 720 },
  { label: 'Permanent', hours: 0 },
] as const;

interface BlockModalProps {
  player: Player;
  onClose: () => void;
  onConfirm: (reason: string, isPermanent: boolean, blockedUntil?: string) => void;
  loading: boolean;
}

function BlockModal({ player, onClose, onConfirm, loading }: BlockModalProps) {
  const [reason, setReason] = useState('');
  const [durationIndex, setDurationIndex] = useState(5); // default: Permanent

  const handleConfirm = () => {
    const dur = BLOCK_DURATIONS[durationIndex];
    if (dur.hours === 0) {
      onConfirm(reason, true);
    } else {
      const until = new Date(Date.now() + dur.hours * 3600_000).toISOString();
      onConfirm(reason, false, until);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Block Player</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-text-secondary text-sm mb-4">
          Block <span className="font-semibold text-text-primary">{player.username}</span> from chatting?
          They will be unable to send messages.
        </p>
        <label className="block text-text-muted text-xs mb-1 uppercase tracking-wider">Block Duration</label>
        <select
          value={durationIndex}
          onChange={(e) => setDurationIndex(Number(e.target.value))}
          className="w-full px-3 py-2 bg-input border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
        >
          {BLOCK_DURATIONS.map((d, i) => (
            <option key={i} value={i}>{d.label}</option>
          ))}
        </select>
        <label className="block text-text-muted text-xs mb-1 uppercase tracking-wider">Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g., Spamming chat"
          className="w-full px-3 py-2 bg-input border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Block Player
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded Detail Row
// ---------------------------------------------------------------------------

function PlayerDetail({ player }: { player: Player }) {
  return (
    <tr>
      <td colSpan={7} className="px-4 pb-4">
        <div className="bg-page border border-border rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-text-muted text-xs uppercase tracking-wider block mb-1">Player ID</span>
            <span className="text-text-primary font-mono text-xs break-all">{player.id}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs uppercase tracking-wider block mb-1">External ID</span>
            <span className="text-text-primary font-mono text-xs break-all">{player.externalId}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs uppercase tracking-wider block mb-1">Level</span>
            <span className="text-text-primary">{player.level}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs uppercase tracking-wider block mb-1">Total Wagered</span>
            <span className="text-text-primary">{Number(player.totalWagered || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs uppercase tracking-wider block mb-1">VIP Status</span>
            <VipBadge status={player.vipStatus} />
          </div>
          <div>
            <span className="text-text-muted text-xs uppercase tracking-wider block mb-1">Win Count</span>
            <span className="text-text-primary">{(player.winCount || 0).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs uppercase tracking-wider block mb-1">Last Seen</span>
            <span className="text-text-secondary">{formatFullDate(player.lastSeenAt)}</span>
          </div>
          <div>
            <span className="text-text-muted text-xs uppercase tracking-wider block mb-1">Joined</span>
            <span className="text-text-secondary">{formatFullDate(player.createdAt)}</span>
          </div>
          {player.avatarUrl && (
            <div className="col-span-2 md:col-span-4">
              <span className="text-text-muted text-xs uppercase tracking-wider block mb-1">Avatar URL</span>
              <span className="text-text-primary font-mono text-xs break-all">{player.avatarUrl}</span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function PlayerListPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<Player | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ---- Fetch players ----

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Player[]>('/players');
      setPlayers(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load players';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // ---- Filtered list ----

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.toLowerCase();
    return players.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        p.externalId.toLowerCase().includes(q),
    );
  }, [players, searchQuery]);

  // ---- Actions ----

  const handleBlock = useCallback(
    async (reason: string, isPermanent: boolean, blockedUntil?: string) => {
      if (!blockTarget) return;
      setActionLoading(true);
      try {
        await api.post(`/players/${blockTarget.id}/block`, {
          playerId: blockTarget.id,
          reason,
          isPermanent,
          ...(blockedUntil ? { blockedUntil } : {}),
        });
        setPlayers((prev) =>
          prev.map((p) => (p.id === blockTarget.id ? { ...p, isBlocked: true } : p)),
        );
        setBlockTarget(null);
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Failed to block player';
        alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } finally {
        setActionLoading(false);
      }
    },
    [blockTarget],
  );

  const handleUnblock = useCallback(async (player: Player) => {
    setActionLoading(true);
    try {
      await api.delete(`/players/${player.id}/block/${player.id}`);
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, isBlocked: false } : p)),
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to unblock player';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setActionLoading(false);
    }
  }, []);

  // ---- Stats ----

  const totalCount = players.length;
  const premiumCount = players.filter((p) => p.isPremium).length;

  // ---- Render ----

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Players</h2>
          <p className="text-text-muted text-sm mt-1">Manage player accounts and access</p>
        </div>
        <button
          onClick={fetchPlayers}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/15 rounded-lg">
            <Users size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Total Players</p>
            <p className="text-text-primary text-lg font-bold">{totalCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/15 rounded-lg">
            <ShieldBan size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Moderators</p>
            <p className="text-text-primary text-lg font-bold">{players.filter((p) => p.isModerator).length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-purple-500/15 rounded-lg">
            <Crown size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Premium</p>
            <p className="text-text-primary text-lg font-bold">{premiumCount}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username or external ID..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">Failed to load players</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
          <button
            onClick={fetchPlayers}
            className="text-red-400 hover:text-red-300 text-xs underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !players.length && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center">
          <Loader2 size={28} className="animate-spin text-text-muted mb-3" />
          <p className="text-text-muted text-sm">Loading players...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && players.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center">
          <Users size={32} className="text-text-muted mb-3" />
          <p className="text-text-primary font-medium">No players found</p>
          <p className="text-text-muted text-sm mt-1">Players will appear here once they connect to chat.</p>
        </div>
      )}

      {/* No search results */}
      {!loading && !error && players.length > 0 && filtered.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center">
          <Search size={24} className="text-text-muted mb-2" />
          <p className="text-text-primary font-medium">No results for "{searchQuery}"</p>
          <p className="text-text-muted text-sm mt-1">Try a different search term.</p>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-text-muted text-xs uppercase tracking-wider">
                <th className="p-4 w-8" />
                <th className="p-4">Player</th>
                <th className="p-4">Level</th>
                <th className="p-4">VIP</th>
                <th className="p-4">Flags</th>
                <th className="p-4">Last Seen</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((player) => {
                const isExpanded = expandedId === player.id;
                return (
                  <React.Fragment key={player.id}>
                    <tr
                      className={`border-b border-border/50 hover:bg-hover transition-colors cursor-pointer ${
                        isExpanded ? 'bg-hover' : ''
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : player.id)}
                    >
                      {/* Expand toggle */}
                      <td className="pl-4 pr-0 py-4 text-text-muted">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>

                      {/* Player info */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <PlayerAvatar player={player} />
                          <div>
                            <span className="text-text-primary font-medium text-sm block leading-tight">
                              {player.username}
                            </span>
                            <span className="text-text-muted text-xs">{player.externalId}</span>
                          </div>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="p-4 text-text-secondary text-sm">{player.level}</td>

                      {/* VIP */}
                      <td className="p-4">
                        <VipBadge status={player.vipStatus} />
                      </td>

                      {/* Flags */}
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {player.isPremium && (
                            <span className="bg-purple-900/30 text-purple-400 text-xs px-2 py-0.5 rounded border border-purple-500/20">
                              Premium
                            </span>
                          )}
                          {player.isModerator && (
                            <span className="bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded border border-green-500/20">
                              Mod
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Last seen */}
                      <td className="p-4 text-text-muted text-sm" title={formatFullDate(player.lastSeenAt)}>
                        {formatRelativeTime(player.lastSeenAt)}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockTarget(player);
                          }}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600/15 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-600/25 transition-colors disabled:opacity-50"
                        >
                          <ShieldBan size={13} />
                          Block
                        </button>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && <PlayerDetail player={player} />}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Footer with count */}
          <div className="border-t border-border px-4 py-3 text-text-muted text-xs">
            Showing {filtered.length} of {totalCount} player{totalCount !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>
      )}

      {/* Block confirmation modal */}
      {blockTarget && (
        <BlockModal
          player={blockTarget}
          onClose={() => setBlockTarget(null)}
          onConfirm={handleBlock}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
