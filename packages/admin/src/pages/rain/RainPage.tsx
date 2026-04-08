import React, { useEffect, useState } from 'react';
import { CloudRain, Plus, X, Eye, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';

interface RainEvent {
  id: string;
  channelId: string;
  totalAmount: number;
  currency: string;
  perPlayerAmount: number;
  durationSeconds: number;
  minLevel: number;
  minWagered: number;
  claimantCount: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

interface TriggerForm {
  channelId: string;
  totalAmount: string;
  currency: string;
  durationSeconds: string;
  minLevel: string;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-900/30 text-green-400',
  COMPLETED: 'bg-blue-900/30 text-blue-400',
  CANCELLED: 'bg-red-900/30 text-red-400',
};

export function RainPage() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;

  const [events, setEvents] = useState<RainEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<TriggerForm>({
    channelId: '',
    totalAmount: '',
    currency: 'USD',
    durationSeconds: '60',
    minLevel: '1',
  });

  const [channels, setChannels] = useState<{ id: string; name: string; emoji: string }[]>([]);

  const [detailEvent, setDetailEvent] = useState<RainEvent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch channels for the dropdown
  useEffect(() => {
    api.get('/channels').then((res) => setChannels(res.data)).catch(() => {});
  }, []);

  const fetchEvents = () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    api
      .get(`/tenants/${tenantId}/rain`)
      .then((res) => setEvents(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load rain events'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, [tenantId]);

  const handleTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSubmitting(true);
    setFormError(null);
    api
      .post(`/tenants/${tenantId}/rain`, {
        channelId: form.channelId,
        totalAmount: parseFloat(form.totalAmount),
        currency: form.currency,
        durationSeconds: parseInt(form.durationSeconds, 10),
        minLevel: parseInt(form.minLevel, 10),
      })
      .then(() => {
        setShowModal(false);
        setForm({ channelId: '', totalAmount: '', currency: 'USD', durationSeconds: '60', minLevel: '1' });
        fetchEvents();
      })
      .catch((err) => setFormError(err.response?.data?.message || 'Failed to trigger rain'))
      .finally(() => setSubmitting(false));
  };

  const viewDetail = (id: string) => {
    if (!tenantId) return;
    setDetailLoading(true);
    api
      .get(`/tenants/${tenantId}/rain/${id}`)
      .then((res) => setDetailEvent(res.data))
      .catch(() => setDetailEvent(null))
      .finally(() => setDetailLoading(false));
  };

  if (!tenantId) {
    return (
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-6">Rain Events</h2>
        <p className="text-text-muted">No tenant associated with your account.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CloudRain className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold text-text-primary">Rain Events</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchEvents}
            className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Trigger Rain
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-4 mb-6">{error}</div>
      )}

      {loading ? (
        <div className="text-text-muted text-center py-12">Loading rain events...</div>
      ) : events.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <CloudRain className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No rain events yet. Trigger your first rain event!</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-text-muted text-sm">
                <th className="p-4">Status</th>
                <th className="p-4">Channel</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Per Player</th>
                <th className="p-4">Claimants</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Min Level</th>
                <th className="p-4">Created</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b border-border/50 hover:bg-hover transition-colors">
                  <td className="p-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_STYLES[ev.status]}`}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="p-4 text-text-secondary text-sm">
                    {channels.find((c) => c.id === ev.channelId)?.name || ev.channelId.slice(0, 8) + '...'}
                  </td>
                  <td className="p-4 text-text-primary font-medium">
                    {ev.totalAmount} {ev.currency}
                  </td>
                  <td className="p-4 text-text-secondary">
                    {ev.perPlayerAmount} {ev.currency}
                  </td>
                  <td className="p-4 text-text-secondary">{ev.claimantCount}</td>
                  <td className="p-4 text-text-secondary">{ev.durationSeconds}s</td>
                  <td className="p-4 text-text-secondary">{ev.minLevel}</td>
                  <td className="p-4 text-text-muted text-sm">{new Date(ev.createdAt).toLocaleString()}</td>
                  <td className="p-4">
                    <button
                      onClick={() => viewDetail(ev.id)}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trigger Rain Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">Trigger Rain Event</h3>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            {formError && (
              <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 mb-4 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleTrigger} className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">Channel</label>
                <select
                  required
                  value={form.channelId}
                  onChange={(e) => setForm({ ...form, channelId: e.target.value })}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a channel</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.emoji} {ch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Total Amount</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.totalAmount}
                    onChange={(e) => setForm({ ...form, totalAmount: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-indigo-500"
                    placeholder="100.00"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Currency</label>
                  <input
                    type="text"
                    required
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-muted mb-1">Duration (seconds)</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={form.durationSeconds}
                    onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-muted mb-1">Min Level</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.minLevel}
                    onChange={(e) => setForm({ ...form, minLevel: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors"
              >
                {submitting ? 'Triggering...' : 'Trigger Rain'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {(detailEvent || detailLoading) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">Rain Event Details</h3>
              <button
                onClick={() => setDetailEvent(null)}
                className="text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {detailLoading ? (
              <p className="text-text-muted text-center py-8">Loading...</p>
            ) : detailEvent ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-muted text-sm">Status</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_STYLES[detailEvent.status]}`}>
                    {detailEvent.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted text-sm">Channel</span>
                  <span className="text-text-primary text-sm">
                    {channels.find((c) => c.id === detailEvent.channelId)?.name || detailEvent.channelId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted text-sm">Total Amount</span>
                  <span className="text-text-primary font-medium">
                    {detailEvent.totalAmount} {detailEvent.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted text-sm">Per Player</span>
                  <span className="text-text-secondary">
                    {detailEvent.perPlayerAmount} {detailEvent.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted text-sm">Claimants</span>
                  <span className="text-text-secondary">{detailEvent.claimantCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted text-sm">Duration</span>
                  <span className="text-text-secondary">{detailEvent.durationSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted text-sm">Min Level</span>
                  <span className="text-text-secondary">{detailEvent.minLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted text-sm">Min Wagered</span>
                  <span className="text-text-secondary">{detailEvent.minWagered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted text-sm">Created</span>
                  <span className="text-text-secondary text-sm">
                    {new Date(detailEvent.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
