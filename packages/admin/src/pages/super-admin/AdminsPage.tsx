import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import {
  ShieldCheck,
  UserPlus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Crown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminRole = 'ADMIN' | 'OWNER';

interface SuperAdmin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface CreateAdminForm {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
}

interface EditAdminForm {
  name: string;
  role: AdminRole;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: AdminRole }) {
  if (role === 'OWNER') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border bg-amber-500/15 text-[#F59E0B] border-amber-500/30">
        <Crown size={11} />
        OWNER
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border bg-blue-500/15 text-[#3B82F6] border-blue-500/30">
      <ShieldCheck size={11} />
      ADMIN
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
// Create Admin Modal
// ---------------------------------------------------------------------------

function CreateAdminModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAdminForm) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<CreateAdminForm>({
    email: '',
    password: '',
    name: '',
    role: 'ADMIN',
  });

  if (!isOpen) return null;

  const canSubmit = form.email.trim() && form.password.trim() && form.name.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">Create Super Admin</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. John Doe"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="admin@example.com"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Minimum 8 characters"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as AdminRole }))}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={isSubmitting || !canSubmit}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Create Admin
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Admin Modal
// ---------------------------------------------------------------------------

function EditAdminModal({
  isOpen,
  onClose,
  onSubmit,
  admin,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditAdminForm) => void;
  admin: SuperAdmin | null;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<EditAdminForm>({
    name: '',
    role: 'ADMIN',
    isActive: true,
  });

  useEffect(() => {
    if (admin) {
      setForm({
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
      });
    }
  }, [admin]);

  if (!isOpen || !admin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">Edit Admin</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Email</label>
            <input
              type="email"
              value={admin.email}
              disabled
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Admin name"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as AdminRole }))}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editIsActive"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-border bg-input text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="editIsActive" className="text-sm text-text-primary">
              Active
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={isSubmitting || !form.name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deactivate Confirm Modal
// ---------------------------------------------------------------------------

function DeactivateModal({
  isOpen,
  onClose,
  onConfirm,
  adminName,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  adminName: string;
  isDeleting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-text-primary">Deactivate Admin</h3>
        </div>
        <p className="text-sm text-text-muted mb-6">
          Are you sure you want to deactivate{' '}
          <span className="text-text-primary font-medium">{adminName}</span>?
          They will no longer be able to log in.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isDeleting && <Loader2 size={14} className="animate-spin" />}
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function AdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SuperAdmin | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SuperAdmin | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SuperAdmin[]>('/super-admin/admins');
      setAdmins(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load admins';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  // ---- Create ----

  const handleCreate = useCallback(async (data: CreateAdminForm) => {
    setIsSubmitting(true);
    try {
      await api.post('/super-admin/admins', data);
      setIsCreateOpen(false);
      await fetchAdmins();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create admin';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchAdmins]);

  // ---- Edit ----

  const handleEdit = useCallback(async (data: EditAdminForm) => {
    if (!editTarget) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/super-admin/admins/${editTarget.id}`, data);
      setEditTarget(null);
      await fetchAdmins();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update admin';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  }, [editTarget, fetchAdmins]);

  // ---- Deactivate ----

  const handleDeactivate = useCallback(async () => {
    if (!deactivateTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/super-admin/admins/${deactivateTarget.id}`);
      setDeactivateTarget(null);
      await fetchAdmins();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to deactivate admin';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  }, [deactivateTarget, fetchAdmins]);

  // ---- Stats ----
  const totalCount = admins.length;
  const activeCount = admins.filter((a) => a.isActive).length;
  const ownerCount = admins.filter((a) => a.role === 'OWNER').length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Super Admins</h2>
          <p className="text-text-muted text-sm mt-1">Manage platform administrators</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdmins}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <UserPlus size={16} />
            New Admin
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/15 rounded-lg">
            <ShieldCheck size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Total Admins</p>
            <p className="text-text-primary text-lg font-bold">{totalCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/15 rounded-lg">
            <ShieldCheck size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Active</p>
            <p className="text-text-primary text-lg font-bold">{activeCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-amber-500/15 rounded-lg">
            <Crown size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Owners</p>
            <p className="text-text-primary text-lg font-bold">{ownerCount}</p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">Failed to load admins</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
          <button
            onClick={fetchAdmins}
            className="text-red-400 hover:text-red-300 text-xs underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !admins.length && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center">
          <Loader2 size={28} className="animate-spin text-text-muted mb-3" />
          <p className="text-text-muted text-sm">Loading admins...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && admins.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center">
          <ShieldCheck size={32} className="text-text-muted mb-3" />
          <p className="text-text-primary font-medium">No admins found</p>
          <p className="text-text-muted text-sm mt-1">Create the first super admin to get started.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
          >
            Create Admin
          </button>
        </div>
      )}

      {/* Table */}
      {admins.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-text-muted text-xs uppercase tracking-wider">
                <th className="p-4">Admin</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Last Login</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const isSelf = user?.id === admin.id;
                return (
                  <tr
                    key={admin.id}
                    className="border-b border-border/50 hover:bg-hover transition-colors"
                  >
                    {/* Admin info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                          {admin.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-text-primary font-medium text-sm block leading-tight">
                            {admin.name}
                            {isSelf && (
                              <span className="ml-2 text-text-muted text-xs font-normal">(you)</span>
                            )}
                          </span>
                          <span className="text-text-muted text-xs">{admin.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <RoleBadge role={admin.role} />
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <StatusBadge isActive={admin.isActive} />
                    </td>

                    {/* Last login */}
                    <td className="p-4 text-text-muted text-sm" title={formatDateTime(admin.lastLoginAt)}>
                      {formatDate(admin.lastLoginAt)}
                    </td>

                    {/* Created */}
                    <td className="p-4 text-text-muted text-sm">
                      {formatDate(admin.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditTarget(admin)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-indigo-400 hover:bg-indigo-900/20 transition-colors"
                          title="Edit admin"
                        >
                          <Pencil size={15} />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => setDeactivateTarget(admin)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-900/20 transition-colors"
                            title="Deactivate admin"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 text-text-muted text-xs">
            Showing {admins.length} admin{admins.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateAdminModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <EditAdminModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        admin={editTarget}
        isSubmitting={isSubmitting}
      />

      <DeactivateModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        adminName={deactivateTarget?.name || ''}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
