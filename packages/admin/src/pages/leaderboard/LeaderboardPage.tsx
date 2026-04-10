import React, { useEffect, useState } from 'react';
import { Trophy, RefreshCw, Calculator, Loader2, X } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';

type Period = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALLTIME';

interface LeaderboardEntry {
  id: string;
  playerId: string;
  player?: {
    username: string;
    avatarUrl: string | null;
    vipStatus: string;
  };
  period: Period;
  wagered: number;
  rank: number;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'ALLTIME', label: 'All Time' },
];

const VIP_COLORS: Record<string, string> = {
  DIAMOND: 'bg-cyan-900/30 text-cyan-300',
  PLATINUM: 'bg-gray-700/30 text-gray-300',
  GOLD: 'bg-yellow-900/30 text-yellow-400',
  SILVER: 'bg-gray-600/30 text-gray-400',
  BRONZE: 'bg-orange-900/30 text-orange-400',
};

const RANK_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-700/50' },
  2: { bg: 'bg-gray-600/20', text: 'text-gray-300', border: 'border-gray-500/50' },
  3: { bg: 'bg-orange-900/20', text: 'text-orange-400', border: 'border-orange-700/50' },
};

const RANK_LABELS: Record<number, string> = {
  1: 'Gold',
  2: 'Silver',
  3: 'Bronze',
};

export function LeaderboardPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const [period, setPeriod] = useState<Period>('WEEKLY');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchLeaderboard = () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/tenants/${tenantId}/leaderboard`, { params: { period, limit: 20 } })
      .then((res) => setEntries(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [tenantId, period]);

  const handleRecalculate = async () => {
    if (!tenantId) return;
    setRecalculating(true);
    setError(null);
    try {
      const res = await api.post(`/tenants/${tenantId}/leaderboard/recalculate`, null, {
        params: { period },
      });
      setEntries(res.data);
      setSuccessMsg('Leaderboard recalculated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to recalculate leaderboard');
    } finally {
      setRecalculating(false);
    }
  };

  if (!tenantId) {
    return (
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-6">Leaderboard</h2>
        <p className="text-text-muted">No tenant associated with your account.</p>
      </div>
    );
  }

  const formatWagered = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-text-primary">Leaderboard</h2>
        </div>
        <button
          onClick={fetchLeaderboard}
          className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Period Tabs + Recalculate */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
        >
          {recalculating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calculator className="w-4 h-4" />
          )}
          Recalculate
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-900/20 border border-green-800 text-green-400 rounded-lg p-3 mb-4 text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-green-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-4 mb-6">{error}</div>
      )}

      {loading ? (
        <div className="text-text-muted text-center py-12">Loading leaderboard...</div>
      ) : entries.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Trophy className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No leaderboard data for this period.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isTopThree = entry.rank >= 1 && entry.rank <= 3;
            const rankStyle = RANK_STYLES[entry.rank];
            const vipStyle = entry.player?.vipStatus ? VIP_COLORS[entry.player.vipStatus] : null;

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  isTopThree && rankStyle
                    ? `${rankStyle.bg} ${rankStyle.border}`
                    : 'bg-card border-border hover:bg-hover'
                }`}
              >
                {/* Rank */}
                <div className="w-10 flex-shrink-0 text-center">
                  {isTopThree && rankStyle ? (
                    <span className={`text-2xl font-bold ${rankStyle.text}`}>
                      {entry.rank}
                    </span>
                  ) : (
                    <span className="text-lg font-medium text-text-muted">
                      {entry.rank}
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 flex-shrink-0 rounded-full bg-input border border-border flex items-center justify-center overflow-hidden">
                  {entry.player?.avatarUrl ? (
                    <img
                      src={entry.player.avatarUrl}
                      alt={entry.player.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-text-muted text-sm font-medium">
                      {entry.player?.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium truncate ${
                        isTopThree && rankStyle ? rankStyle.text : 'text-text-primary'
                      }`}
                    >
                      {entry.player?.username || `Player ${entry.playerId.slice(0, 8)}`}
                    </span>
                    {vipStyle && entry.player?.vipStatus !== 'NONE' && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${vipStyle}`}>
                        {entry.player?.vipStatus}
                      </span>
                    )}
                    {isTopThree && (
                      <span className="text-xs text-text-muted">
                        {RANK_LABELS[entry.rank]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Wagered Amount */}
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-lg font-bold ${
                      isTopThree && rankStyle ? rankStyle.text : 'text-text-primary'
                    }`}
                  >
                    {formatWagered(entry.wagered)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
