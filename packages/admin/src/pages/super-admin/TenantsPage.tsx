import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Plus,
  Pencil,
  Trash2,
  Eye,
  Power,
  X,
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
  webhookUrl?: string;
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

interface TenantAdmin {
  id: string;
  email: string;
  role: string;
  createdAt: string;
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

const TIERS: Tier[] = ['BASIC', 'SOCIAL', 'ENGAGE', 'MONETIZE'];

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
      {isActive ? 'Active' : 'Suspended'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Modal Wrapper
// ---------------------------------------------------------------------------

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Tenant Modal
// ---------------------------------------------------------------------------

function CreateTenantModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    domain: '',
    tier: 'BASIC' as Tier,
    adminEmail: '',
    adminPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/super-admin/tenants', form);
      onCreated();
      onClose();
      setForm({ name: '', domain: '', tier: 'BASIC', adminEmail: '', adminPassword: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create tenant';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Tenant">
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
            placeholder="Casino Name"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Domain</label>
          <input
            type="text"
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
            placeholder="casino.example.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Tier</label>
          <select
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value as Tier })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Admin Email</label>
          <input
            type="email"
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
            placeholder="admin@casino.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Admin Password</label>
          <input
            type="password"
            value={form.adminPassword}
            onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
            placeholder="********"
            required
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit Tenant Modal
// ---------------------------------------------------------------------------

function EditTenantModal({
  open,
  onClose,
  onUpdated,
  tenant,
}: {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  tenant: Tenant | null;
}) {
  const [form, setForm] = useState({ name: '', domain: '', tier: 'BASIC' as Tier, webhookUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name,
        domain: tenant.domain,
        tier: tenant.tier,
        webhookUrl: tenant.webhookUrl || '',
      });
      setError('');
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    setError('');
    try {
      await api.patch(`/super-admin/tenants/${tenant.id}`, form);
      onUpdated();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update tenant';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Tenant">
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Domain</label>
          <input
            type="text"
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Tier</label>
          <select
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value as Tier })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Webhook URL</label>
          <input
            type="url"
            value={form.webhookUrl}
            onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
            className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-indigo-500 focus:outline-none"
            placeholder="https://casino.example.com/webhook"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------------------

function DeleteTenantModal({
  open,
  onClose,
  onDeleted,
  tenant,
}: {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  tenant: Tenant | null;
}) {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setConfirmName('');
      setError('');
    }
  }, [open]);

  const handleDelete = async () => {
    if (!tenant || confirmName !== tenant.name) return;
    setLoading(true);
    setError('');
    try {
      await api.delete(`/super-admin/tenants/${tenant.id}`);
      onDeleted();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete tenant';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete Tenant">
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>
      )}
      <div className="space-y-4">
        <p className="text-text-secondary text-sm">
          This action is irreversible. All tenant data including players, messages, and channels will be permanently
          deleted.
        </p>
        <p className="text-text-secondary text-sm">
          Type <strong className="text-red-400">{tenant?.name}</strong> to confirm:
        </p>
        <input
          type="text"
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary focus:border-red-500 focus:outline-none"
          placeholder="Tenant name"
        />
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || confirmName !== tenant?.name}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Expanded Stats + Admins Row
// ---------------------------------------------------------------------------

function TenantStatsRow({ tenantId }: { tenantId: string }) {
  const [stats, setStats] = useState<TenantStatsResponse['stats'] | null>(null);
  const [admins, setAdmins] = useState<TenantAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsRes, adminsRes] = await Promise.all([
          api.get<TenantStatsResponse>(`/super-admin/tenants/${tenantId}/stats`),
          api.get<TenantAdmin[]>(`/super-admin/tenants/${tenantId}/admins`).catch(() => ({ data: [] as TenantAdmin[] })),
        ]);
        if (!cancelled) {
          setStats(statsRes.data.stats);
          setAdmins(adminsRes.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.response?.data?.message || err.message || 'Failed to load stats';
          setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  if (loading) {
    return (
      <tr>
        <td colSpan={7} className="px-4 pb-4">
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
        <td colSpan={7} className="px-4 pb-4">
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
      <td colSpan={7} className="px-4 pb-4">
        <div className="bg-page border border-border rounded-lg p-4 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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

          {/* Admins List */}
          {admins.length > 0 && (
            <div>
              <h4 className="text-text-muted text-xs uppercase tracking-wider mb-2">Tenant Admins</h4>
              <div className="space-y-1">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="text-text-primary">{admin.email}</span>
                      <span className="text-text-muted text-xs ml-2">({admin.role})</span>
                    </div>
                    <span className="text-text-muted text-xs">{formatDate(admin.createdAt)}</span>
                  </div>
                ))}
              </div>
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

export function TenantsPage() {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  // ---- Suspend / Activate ----
  const handleToggleStatus = async (tenant: Tenant) => {
    const action = tenant.isActive ? 'suspend' : 'activate';
    const confirmMsg = tenant.isActive
      ? `Suspend "${tenant.name}"? Users will be disconnected.`
      : `Activate "${tenant.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(tenant.id);
    try {
      await api.patch(`/super-admin/tenants/${tenant.id}/${action}`);
      await fetchTenants();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || `Failed to ${action} tenant`;
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setActionLoadingId(null);
    }
  };

  // ---- Impersonate ----
  const handleImpersonate = async (tenant: Tenant) => {
    if (!window.confirm(`Impersonate tenant "${tenant.name}"? You will switch to their admin view.`)) return;

    setActionLoadingId(tenant.id);
    try {
      const res = await api.post<{
        accessToken: string;
        admin: { id: string; email: string; tenantId: string; role: string };
        tenant: { id: string; name: string; domain: string; tier: string };
      }>(`/super-admin/tenants/${tenant.id}/impersonate`);

      const { accessToken, admin } = res.data;

      // Save current super admin session for later restoration
      if (token) {
        sessionStorage.setItem('superadmin_token', token);
      }
      if (user) {
        sessionStorage.setItem('superadmin_user', JSON.stringify(user));
      }

      // Login as the tenant admin
      login(accessToken, {
        id: admin.id,
        email: admin.email,
        tenantId: admin.tenantId,
        role: admin.role,
        isSuperAdmin: false,
      });

      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to impersonate tenant';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setActionLoadingId(null);
    }
  };

  // ---- Stats ----
  const totalCount = tenants.length;
  const activeCount = tenants.filter((t) => t.isActive).length;
  const tierCounts: Record<Tier, number> = { BASIC: 0, SOCIAL: 0, ENGAGE: 0, MONETIZE: 0 };
  tenants.forEach((t) => {
    if (tierCounts[t.tier] !== undefined) tierCounts[t.tier]++;
  });

  return (
    <div>
      {/* Modals */}
      <CreateTenantModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchTenants} />
      <EditTenantModal
        open={editTenant !== null}
        onClose={() => setEditTenant(null)}
        onUpdated={fetchTenants}
        tenant={editTenant}
      />
      <DeleteTenantModal
        open={deleteTenant !== null}
        onClose={() => setDeleteTenant(null)}
        onDeleted={fetchTenants}
        tenant={deleteTenant}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Tenants</h2>
          <p className="text-text-muted text-sm mt-1">Manage all casino tenants on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTenants}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus size={14} />
            Create Tenant
          </button>
        </div>
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
          <button onClick={fetchTenants} className="text-red-400 hover:text-red-300 text-xs underline shrink-0">
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
          <p className="text-text-muted text-sm mt-1">Click "Create Tenant" to add your first casino.</p>
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
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                const isExpanded = expandedId === tenant.id;
                const isActionLoading = actionLoadingId === tenant.id;
                return (
                  <React.Fragment key={tenant.id}>
                    <tr
                      className={`border-b border-border/50 hover:bg-hover transition-colors ${
                        isExpanded ? 'bg-hover' : ''
                      }`}
                    >
                      {/* Expand toggle */}
                      <td
                        className="pl-4 pr-0 py-4 text-text-muted cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : tenant.id)}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>

                      {/* Tenant info */}
                      <td
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : tenant.id)}
                      >
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
                        {tenant._count?.players?.toLocaleString() ?? '\u2014'}
                      </td>

                      {/* Created */}
                      <td className="p-4 text-text-muted text-sm">{formatDate(tenant.createdAt)}</td>

                      {/* Actions */}
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => setEditTenant(tenant)}
                            className="p-1.5 text-text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Edit tenant"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Suspend / Activate */}
                          <button
                            onClick={() => handleToggleStatus(tenant)}
                            disabled={isActionLoading}
                            className={`p-1.5 rounded-lg transition-colors ${
                              tenant.isActive
                                ? 'text-text-muted hover:text-amber-400 hover:bg-amber-500/10'
                                : 'text-text-muted hover:text-green-400 hover:bg-green-500/10'
                            } disabled:opacity-50`}
                            title={tenant.isActive ? 'Suspend tenant' : 'Activate tenant'}
                          >
                            {isActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                          </button>

                          {/* Impersonate */}
                          <button
                            onClick={() => handleImpersonate(tenant)}
                            disabled={isActionLoading}
                            className="p-1.5 text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="Impersonate tenant"
                          >
                            <Eye size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTenant(tenant)}
                            className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete tenant"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded stats + admins row */}
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
