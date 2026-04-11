import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Megaphone, Send } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';

interface Channel {
  id: string;
  name: string;
}

interface PromoCard {
  id: string;
  title: string;
  subtitle: string;
  detailText: string;
  ctaText: string;
  ctaUrl: string;
  emoji: string;
  accentColor: string;
  isActive: boolean;
  createdAt: string;
}

interface PromoFormData {
  title: string;
  subtitle: string;
  detailText: string;
  ctaText: string;
  ctaUrl: string;
  emoji: string;
  accentColor: string;
}

const defaultForm: PromoFormData = {
  title: '',
  subtitle: '',
  detailText: '',
  ctaText: '',
  ctaUrl: '',
  emoji: '🎉',
  accentColor: '#FF6B6B',
};

export function PromosPage() {
  const { user } = useAuth();
  const [promos, setPromos] = useState<PromoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCard | null>(null);
  const [formData, setFormData] = useState<PromoFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sendToChat, setSendToChat] = useState<PromoCard | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const tenantId = user?.tenantId;

  const fetchPromos = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/tenants/${tenantId}/promos`);
      setPromos(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load promos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, [tenantId]);

  const openCreate = () => {
    setFormData(defaultForm);
    setShowCreateModal(true);
  };

  const openEdit = (promo: PromoCard) => {
    setEditingPromo(promo);
    setFormData({
      title: promo.title,
      subtitle: promo.subtitle || '',
      detailText: promo.detailText || '',
      ctaText: promo.ctaText || '',
      ctaUrl: promo.ctaUrl || '',
      emoji: promo.emoji || '🎉',
      accentColor: promo.accentColor || '#FF6B6B',
    });
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setEditingPromo(null);
    setFormData(defaultForm);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !formData.title.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tenants/${tenantId}/promos`, formData);
      closeModals();
      await fetchPromos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create promo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !editingPromo || !formData.title.trim()) return;
    setSubmitting(true);
    try {
      await api.patch(`/tenants/${tenantId}/promos/${editingPromo.id}`, formData);
      closeModals();
      await fetchPromos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update promo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!tenantId) return;
    try {
      await api.delete(`/tenants/${tenantId}/promos/${id}`);
      setConfirmDelete(null);
      await fetchPromos();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate promo');
    }
  };

  const openSendToChat = async (promo: PromoCard) => {
    setSendToChat(promo);
    setSelectedChannel('');
    try {
      const res = await api.get('/channels');
      setChannels(res.data);
      if (res.data.length > 0) setSelectedChannel(res.data[0].id);
    } catch {
      setError('Failed to load channels');
    }
  };

  const handleSendToChat = async () => {
    if (!tenantId || !sendToChat || !selectedChannel) return;
    setSending(true);
    try {
      await api.post(`/tenants/${tenantId}/channels/${selectedChannel}/messages`, {
        text: JSON.stringify({
          title: sendToChat.title,
          subtitle: sendToChat.subtitle,
          detailText: sendToChat.detailText,
          ctaText: sendToChat.ctaText,
          ctaUrl: sendToChat.ctaUrl,
          emoji: sendToChat.emoji,
          accentColor: sendToChat.accentColor,
        }),
        type: 'PROMO',
        source: 'SYSTEM',
      });
      setSendToChat(null);
      setSuccessMsg('Promo sent to chat successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send promo to chat');
    } finally {
      setSending(false);
    }
  };

  const updateField = (field: keyof PromoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-text-muted text-sm mb-1">Title *</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Weekend Bonus Blast"
        />
      </div>
      <div>
        <label className="block text-text-muted text-sm mb-1">Subtitle</label>
        <input
          type="text"
          value={formData.subtitle}
          onChange={(e) => updateField('subtitle', e.target.value)}
          className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Don't miss out!"
        />
      </div>
      <div>
        <label className="block text-text-muted text-sm mb-1">Detail Text</label>
        <textarea
          value={formData.detailText}
          onChange={(e) => updateField('detailText', e.target.value)}
          rows={3}
          className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Get 200% bonus on your next deposit..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-text-muted text-sm mb-1">CTA Text</label>
          <input
            type="text"
            value={formData.ctaText}
            onChange={(e) => updateField('ctaText', e.target.value)}
            className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Claim Now"
          />
        </div>
        <div>
          <label className="block text-text-muted text-sm mb-1">CTA URL</label>
          <input
            type="text"
            value={formData.ctaUrl}
            onChange={(e) => updateField('ctaUrl', e.target.value)}
            className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="https://casino.com/promo"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-text-muted text-sm mb-1">Emoji</label>
          <input
            type="text"
            value={formData.emoji}
            onChange={(e) => updateField('emoji', e.target.value)}
            className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="🎉"
          />
        </div>
        <div>
          <label className="block text-text-muted text-sm mb-1">Accent Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.accentColor}
              onChange={(e) => updateField('accentColor', e.target.value)}
              className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={formData.accentColor}
              onChange={(e) => updateField('accentColor', e.target.value)}
              className="flex-1 bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={closeModals}
          className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !formData.title.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? 'Update Promo' : 'Create Promo'}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">Promotional Cards</h2>
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Promo
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
        <div className="bg-red-900/20 border border-red-800 text-red-400 rounded-lg p-3 mb-4 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-text-muted text-sm">
                <th className="p-4">Promo</th>
                <th className="p-4">CTA</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((promo) => (
                <tr key={promo.id} className="border-b border-border/50 hover:bg-hover transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: promo.accentColor + '20' }}
                      >
                        {promo.emoji}
                      </span>
                      <div>
                        <div className="text-text-primary font-medium">{promo.title}</div>
                        {promo.subtitle && (
                          <div className="text-text-muted text-xs">{promo.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {promo.ctaText ? (
                      <span className="text-indigo-400 text-sm">{promo.ctaText}</span>
                    ) : (
                      <span className="text-text-muted text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        promo.isActive
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {promo.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-text-muted text-sm">
                    {new Date(promo.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openSendToChat(promo)}
                        className="p-2 text-text-muted hover:text-indigo-400 hover:bg-[#1E293B] rounded-lg transition-colors"
                        title="Send to Chat"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(promo)}
                        className="p-2 text-text-muted hover:text-text-primary hover:bg-[#1E293B] rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {promo.isActive && (
                        <>
                          {confirmDelete === promo.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeactivate(promo.id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2 py-1 text-text-muted hover:text-text-primary text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(promo.id)}
                              className="p-2 text-text-muted hover:text-red-400 hover:bg-[#1E293B] rounded-lg transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {promos.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Megaphone className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-text-muted text-sm">No promotional cards yet</p>
                    <button
                      onClick={openCreate}
                      className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
                    >
                      Create your first promo
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Create Promo Card</h3>
              <button
                onClick={closeModals}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">{renderForm(handleCreate, false)}</div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPromo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Edit Promo Card</h3>
              <button
                onClick={closeModals}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">{renderForm(handleUpdate, true)}</div>
          </div>
        </div>
      )}

      {/* Send to Chat Modal */}
      {sendToChat && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Send to Chat</h3>
              <button
                onClick={() => setSendToChat(null)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-text-secondary text-sm">
                Send <span className="text-text-primary font-medium">{sendToChat.title}</span> to a channel:
              </p>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSendToChat(null)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendToChat}
                  disabled={sending || !selectedChannel}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
