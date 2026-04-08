import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
  MessageSquare,
  Hash,
  Loader2,
  AlertCircle,
  RefreshCw,
  UserCog,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tier = 'BASIC' | 'SOCIAL' | 'ENGAGE' | 'MONETIZE';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  tier: Tier;
  isActive: boolean;
  apiKey: string;
  createdAt: string;
  _count?: {
    players: number;
    channels: number;
  };
}

interface TenantStatsResponse {
  tenant: Tenant;
  stats: {
    players: number;
    channels: number;
    messages: number;
    admins: number;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_STYLES: Record<Tier, { bg: string; text: string; border: string }> = {
  BASIC:    { bg: 'bg-green-500/15',  text: 'text-[#22C55E]', border: 'border-green-500/30' },
  SOCIAL:   { bg: 'bg-blue-500/15',   text: 'text-[#3B82F6]', border: 'border-blue-500/30' },
  ENGAGE:   { bg: 'bg-amber-500/15',  text: 'text-[#F59E0B]', border: 'border-amber-500/30' },
  MONETIZE: { bg: 'bg-red-500/15',    text: 'text-[#EF4444]', border: 'border-red-500/30' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: Tier }) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.BASIC;
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}
    >
      {tier}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        isActive
          ? 'bg-green-900/30 text-green-400'
          : 'bg-red-900/30 text-red-400'
      }`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Expanded Stats Row
// ---------------------------------------------------------------------------

function TenantStatsRow({ tenantId }: { tenantId: string }) {
  const [stats, setStats] = useState<TenantStatsResponse['stats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<TenantStatsResponse>(`/super-admin/tenants/${tenantId}/stats`);
        if (!cancelled) setStats(res.data.stats);
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.response?.data?.message || err.message || 'Failed to load stats';
          setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tenantId]);

  if (loading) {
    return (
      <tr>
        <td colSpan={6} className="px-4 pb-4">
          <div className="bg-page border border-border rounded-lg p-6 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-text-muted" />
            <span className="text-text-muted text-sm ml-2">Loading stats...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (error) {
    return (
      <tr>
        <td colSpan={6} className="px-4 pb-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </td>
      </tr>
    );
  }

  if (!stats) return null;

  return (
    <tr>
      <td colSpan={6} className="px-4 pb-4">
        <div className="bg-page border border-border rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/15 rounded-lg">
              <Users size={16} className="text-blue-400" />
            </div>
            <div>
              <span className="text-text-muted text-xs uppercase tracking-wider block">Players</span>
              <span className="text-text-primary font-bold">{(stats.players ?? 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/15 rounded-lg">
              <Hash size={16} className="text-indigo-400" />
            </div>
            <div>
              <span className="text-text-muted text-xs uppercase tracking-wider block">Channels</span>
              <span className="text-text-primary font-bold">{(stats.channels ?? 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/15 rounded-lg">
              <MessageSquare size={16} className="text-purple-400" />
            </div>
            <div>
              <span className="text-text-muted text-xs uppercase tracking-wider block">Messages</span>
              <span className="text-text-primary font-bold">{(stats.messages ?? 0).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/15 rounded-lg">
              <UserCog size={16} className="text-green-400" />
            </div>
            <div>
              <span className="text-text-muted text-xs uppercase tracking-wider block">Admins</span>
              <span className="text-text-primary font-bold">{(stats.admins ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Tenant[]>('/super-admin/tenants');
      setTenants(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load tenants';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // ---- Stats ----
  const totalCount = tenants.length;
  const activeCount = tenants.filter((t) => t.isActive).length;
  const tierCounts: Record<Tier, number> = { BASIC: 0, SOCIAL: 0, ENGAGE: 0, MONETIZE: 0 };
  tenants.forEach((t) => {
    if (tierCounts[t.tier] !== undefined) tierCounts[t.tier]++;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Tenants</h2>
          <p className="text-text-muted text-sm mt-1">Manage all casino tenants on the platform</p>
        </div>
        <button
          onClick={fetchTenants}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/15 rounded-lg">
            <Building2 size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Total</p>
            <p className="text-text-primary text-lg font-bold">{totalCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/15 rounded-lg">
            <Building2 size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Active</p>
            <p className="text-text-primary text-lg font-bold">{activeCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-500/15 rounded-lg">
            <Building2 size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Engage+</p>
            <p className="text-text-primary text-lg font-bold">{tierCounts.ENGAGE + tierCounts.MONETIZE}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-red-500/15 rounded-lg">
            <Building2 size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Inactive</p>
            <p className="text-text-primary text-lg font-bold">{totalCount - activeCount}</p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">Failed to load tenants</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
          <button
            onClick={fetchTenants}
            className="text-red-400 hover:text-red-300 text-xs underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !tenants.length && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center">
          <Loader2 size={28} className="animate-spin text-text-muted mb-3" />
          <p className="text-text-muted text-sm">Loading tenants...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tenants.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center">
          <Building2 size={32} className="text-text-muted mb-3" />
          <p className="text-text-primary font-medium">No tenants found</p>
          <p className="text-text-muted text-sm mt-1">Tenants will appear here once they are created.</p>
        </div>
      )}

      {/* Table */}
      {tenants.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-text-muted text-xs uppercase tracking-wider">
                <th className="p-4 w-8" />
                <th className="p-4">Tenant</th>
                <th className="p-4">Tier</th>
                <th className="p-4">Status</th>
                <th className="p-4">Players</th>
                <th className="p-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                const isExpanded = expandedId === tenant.id;
                return (
                  <React.Fragment key={tenant.id}>
                    <tr
                      className={`border-b border-border/50 hover:bg-hover transition-colors cursor-pointer ${
                        isExpanded ? 'bg-hover' : ''
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : tenant.id)}
                    >
                      {/* Expand toggle */}
                      <td className="pl-4 pr-0 py-4 text-text-muted">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>

                      {/* Tenant info */}
                      <td className="p-4">
                        <div>
                          <span className="text-text-primary font-medium text-sm block leading-tight">
                            {tenant.name}
                          </span>
                          <span className="text-text-muted text-xs">{tenant.domain}</span>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="p-4">
                        <TierBadge tier={tenant.tier} />
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <StatusBadge isActive={tenant.isActive} />
                      </td>

                      {/* Player count */}
                      <td className="p-4 text-text-secondary text-sm">
                        {tenant._count?.players?.toLocaleString() ?? '—'}
                      </td>

                      {/* Created */}
                      <td className="p-4 text-text-muted text-sm">
                        {formatDate(tenant.createdAt)}
                      </td>
                    </tr>

                    {/* Expanded stats row */}
                    {isExpanded && <TenantStatsRow tenantId={tenant.id} />}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 text-text-muted text-xs">
            Showing {tenants.length} tenant{tenants.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
