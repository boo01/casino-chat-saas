import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import {
  Coins,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CurrencyType = 'FIAT' | 'CRYPTO';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  type: CurrencyType;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface CreateCurrencyForm {
  code: string;
  name: string;
  symbol: string;
  type: CurrencyType;
}

interface EditCurrencyForm {
  code: string;
  name: string;
  symbol: string;
  type: CurrencyType;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: CurrencyType }) {
  if (type === 'FIAT') {
    return (
      <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border bg-green-500/15 text-green-400 border-green-500/30">
        FIAT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border bg-blue-500/15 text-blue-400 border-blue-500/30">
      CRYPTO
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
// Create Currency Modal
// ---------------------------------------------------------------------------

function CreateCurrencyModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCurrencyForm) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<CreateCurrencyForm>({
    code: '',
    name: '',
    symbol: '',
    type: 'FIAT',
  });

  if (!isOpen) return null;

  const canSubmit = form.code.trim() && form.name.trim() && form.symbol.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">Create Currency</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Code *</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. USD, BTC"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. US Dollar, Bitcoin"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Symbol *</label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm((prev) => ({ ...prev, symbol: e.target.value }))}
              placeholder="e.g. $, BTC"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as CurrencyType }))}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="FIAT">Fiat</option>
              <option value="CRYPTO">Crypto</option>
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
            Create Currency
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit Currency Modal
// ---------------------------------------------------------------------------

function EditCurrencyModal({
  isOpen,
  onClose,
  onSubmit,
  currency,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EditCurrencyForm) => void;
  currency: Currency | null;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<EditCurrencyForm>({
    code: '',
    name: '',
    symbol: '',
    type: 'FIAT',
    isActive: true,
  });

  useEffect(() => {
    if (currency) {
      setForm({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        type: currency.type,
        isActive: currency.isActive,
      });
    }
  }, [currency]);

  if (!isOpen || !currency) return null;

  const canSubmit = form.code.trim() && form.name.trim() && form.symbol.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">Edit Currency</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Symbol</label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm((prev) => ({ ...prev, symbol: e.target.value }))}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as CurrencyType }))}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="FIAT">Fiat</option>
              <option value="CRYPTO">Crypto</option>
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
            disabled={isSubmitting || !canSubmit}
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
  currencyName,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currencyName: string;
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
          <h3 className="text-lg font-bold text-text-primary">Deactivate Currency</h3>
        </div>
        <p className="text-sm text-text-muted mb-6">
          Are you sure you want to deactivate{' '}
          <span className="text-text-primary font-medium">{currencyName}</span>?
          Tenants using this currency will not be affected, but it will no longer be available for new assignments.
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

export function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Currency | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Currency | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCurrencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Currency[]>('/super-admin/currencies');
      setCurrencies(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to load currencies';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrencies();
  }, [fetchCurrencies]);

  // ---- Create ----

  const handleCreate = useCallback(async (data: CreateCurrencyForm) => {
    setIsSubmitting(true);
    try {
      await api.post('/super-admin/currencies', data);
      setIsCreateOpen(false);
      await fetchCurrencies();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to create currency';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchCurrencies]);

  // ---- Edit ----

  const handleEdit = useCallback(async (data: EditCurrencyForm) => {
    if (!editTarget) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/super-admin/currencies/${editTarget.id}`, data);
      setEditTarget(null);
      await fetchCurrencies();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update currency';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  }, [editTarget, fetchCurrencies]);

  // ---- Deactivate ----

  const handleDeactivate = useCallback(async () => {
    if (!deactivateTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/super-admin/currencies/${deactivateTarget.id}`);
      setDeactivateTarget(null);
      await fetchCurrencies();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Failed to deactivate currency';
      alert(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  }, [deactivateTarget, fetchCurrencies]);

  // ---- Stats ----
  const totalCount = currencies.length;
  const activeCount = currencies.filter((c) => c.isActive).length;
  const fiatCount = currencies.filter((c) => c.type === 'FIAT').length;
  const cryptoCount = currencies.filter((c) => c.type === 'CRYPTO').length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Currencies</h2>
          <p className="text-text-muted text-sm mt-1">Manage master currency list</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCurrencies}
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
            <Plus size={16} />
            New Currency
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/15 rounded-lg">
            <Coins size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Total</p>
            <p className="text-text-primary text-lg font-bold">{totalCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/15 rounded-lg">
            <Coins size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Active</p>
            <p className="text-text-primary text-lg font-bold">{activeCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-green-500/15 rounded-lg">
            <Coins size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Fiat</p>
            <p className="text-text-primary text-lg font-bold">{fiatCount}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-blue-500/15 rounded-lg">
            <Coins size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wider">Crypto</p>
            <p className="text-text-primary text-lg font-bold">{cryptoCount}</p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-400 text-sm font-medium">Failed to load currencies</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
          <button
            onClick={fetchCurrencies}
            className="text-red-400 hover:text-red-300 text-xs underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && !currencies.length && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center">
          <Loader2 size={28} className="animate-spin text-text-muted mb-3" />
          <p className="text-text-muted text-sm">Loading currencies...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && currencies.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center">
          <Coins size={32} className="text-text-muted mb-3" />
          <p className="text-text-primary font-medium">No currencies found</p>
          <p className="text-text-muted text-sm mt-1">Create the first currency to get started.</p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
          >
            Create Currency
          </button>
        </div>
      )}

      {/* Table */}
      {currencies.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-text-muted text-xs uppercase tracking-wider">
                <th className="p-4">Code</th>
                <th className="p-4">Name</th>
                <th className="p-4">Symbol</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((currency) => (
                <tr
                  key={currency.id}
                  className="border-b border-border/50 hover:bg-hover transition-colors"
                >
                  <td className="p-4">
                    <span className="text-text-primary font-medium text-sm">
                      {currency.code}
                    </span>
                  </td>
                  <td className="p-4 text-text-secondary text-sm">{currency.name}</td>
                  <td className="p-4 text-text-primary text-sm font-mono">{currency.symbol}</td>
                  <td className="p-4">
                    <TypeBadge type={currency.type} />
                  </td>
                  <td className="p-4">
                    <StatusBadge isActive={currency.isActive} />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditTarget(currency)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-indigo-400 hover:bg-indigo-900/20 transition-colors"
                        title="Edit currency"
                      >
                        <Pencil size={15} />
                      </button>
                      {currency.isActive && (
                        <button
                          onClick={() => setDeactivateTarget(currency)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          title="Deactivate currency"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t border-border px-4 py-3 text-text-muted text-xs">
            Showing {currencies.length} currenc{currencies.length !== 1 ? 'ies' : 'y'}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateCurrencyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <EditCurrencyModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        currency={editTarget}
        isSubmitting={isSubmitting}
      />

      <DeactivateModal
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        currencyName={deactivateTarget ? `${deactivateTarget.name} (${deactivateTarget.code})` : ''}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
