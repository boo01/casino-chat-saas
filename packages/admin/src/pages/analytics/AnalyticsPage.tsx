import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/auth';
import api from '../../api/client';
import { Users, MessageSquare, Radio, BarChart3, Activity } from 'lucide-react';

interface OverviewStats {
  totalPlayers: number;
  totalMessages: number;
  messagesToday: number;
  activeChannels: number;
  onlineLast24h: number;
}

interface ChannelMessageStat {
  channelId: string;
  channelName: string;
  messageCount: number;
}

interface PlayerStats {
  byVipStatus: Record<string, number>;
  byLevel: Record<string, number>;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-muted text-sm">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
    </div>
  );
}

const VIP_COLORS: Record<string, string> = {
  NONE: 'bg-gray-600',
  BRONZE: 'bg-amber-700',
  SILVER: 'bg-gray-400',
  GOLD: 'bg-yellow-500',
  PLATINUM: 'bg-cyan-400',
  DIAMOND: 'bg-purple-500',
};

export function AnalyticsPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [channelMessages, setChannelMessages] = useState<ChannelMessageStat[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const tenantId = user?.tenantId;

  useEffect(() => {
    if (!tenantId) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewRes, playersRes] = await Promise.all([
          api.get(`/tenants/${tenantId}/analytics/overview`),
          api.get(`/tenants/${tenantId}/analytics/players`),
        ]);
        setOverview(overviewRes.data);
        // Transform API arrays into Record maps
        const raw = playersRes.data;
        const byVipStatus: Record<string, number> = {};
        for (const entry of raw.vipDistribution ?? []) {
          byVipStatus[entry.vipStatus] = entry._count;
        }
        const byLevel: Record<string, number> = {};
        for (const entry of raw.levelRanges ?? []) {
          byLevel[entry.range] = entry.count;
        }
        setPlayerStats({ byVipStatus, byLevel });
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/tenants/${tenantId}/analytics/messages`, { params: { days } });
        setChannelMessages(res.data);
      } catch (err) {
        console.error('Failed to fetch message stats:', err);
      }
    };
    fetchMessages();
  }, [tenantId, days]);

  if (!tenantId) {
    return (
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-6">Analytics</h2>
        <div className="bg-card border border-border rounded-xl p-6 text-text-muted">
          Analytics are available per tenant. Select a tenant to view analytics.
        </div>
      </div>
    );
  }

  const maxMessages = channelMessages.length > 0
    ? Math.max(...channelMessages.map((c) => c.messageCount))
    : 1;

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-6">Analytics</h2>

      {loading ? (
        <div className="text-text-muted">Loading analytics...</div>
      ) : (
        <>
          {/* Overview Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Players" value={overview?.totalPlayers || 0} icon={Users} color="bg-indigo-600" />
            <StatCard label="Total Messages" value={overview?.totalMessages || 0} icon={MessageSquare} color="bg-purple-600" />
            <StatCard label="Messages Today" value={overview?.messagesToday || 0} icon={BarChart3} color="bg-green-600" />
            <StatCard label="Active Channels" value={overview?.activeChannels || 0} icon={Radio} color="bg-blue-600" />
            <StatCard label="Online (24h)" value={overview?.onlineLast24h || 0} icon={Activity} color="bg-orange-600" />
          </div>

          {/* Messages Per Channel */}
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-text-primary">Messages per Channel</h3>
              <div className="flex gap-1">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      days === d
                        ? 'bg-indigo-600 text-white'
                        : 'bg-input text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {channelMessages.length === 0 ? (
              <div className="text-text-muted text-sm">No message data available for this period.</div>
            ) : (
              <div className="space-y-3">
                {channelMessages.map((ch) => (
                  <div key={ch.channelId} className="flex items-center gap-3">
                    <span className="text-text-muted text-sm w-32 truncate flex-shrink-0" title={ch.channelName}>
                      {ch.channelName}
                    </span>
                    <div className="flex-1 h-7 bg-input rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-lg flex items-center justify-end pr-2 transition-all duration-300"
                        style={{ width: `${Math.max((ch.messageCount / maxMessages) * 100, 2)}%` }}
                      >
                        <span className="text-xs text-white font-medium">{ch.messageCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Player Distribution */}
          {playerStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* VIP Status */}
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-semibold text-text-primary">VIP Distribution</h3>
                  <span className="text-xs text-text-muted">{Object.values(playerStats.byVipStatus).reduce((a, b) => a + b, 0)} total</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(playerStats.byVipStatus).map(([status, count]) => (
                    <span
                      key={status}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white ${VIP_COLORS[status] || 'bg-gray-600'}`}
                    >
                      {status}
                      <span className="bg-black/20 px-1.5 py-0.5 rounded text-xs">{count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Level Distribution */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-5">Level Distribution</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(playerStats.byLevel).map(([level, count]) => (
                    <span
                      key={level}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-input text-text-primary"
                    >
                      Lv.{level}
                      <span className="bg-indigo-600/30 text-indigo-300 px-1.5 py-0.5 rounded text-xs">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
