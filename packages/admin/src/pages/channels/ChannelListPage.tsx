import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle } from 'lucide-react';

interface Channel {
  id: string;
  tenantId: string;
  name: string;
  emoji: string;
  language: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  maxMessages: number;
  slowModeSeconds: number;
  settings: { minLevel?: number; minWagered?: number };
  createdAt: string;
  updatedAt: string;
}

interface ChannelFormData {
  name: string;
  emoji: string;
  language: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  minLevel: number;
  minWagered: number;
}

const defaultFormData: ChannelFormData = {
  name: '',
  emoji: '💬',
  language: 'en',
  description: '',
  isActive: true,
  sortOrder: 0,
  minLevel: 0,
  minWagered: 0,
};

function ChannelModal({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: ChannelFormData;
  setFormData: React.Dispatch<React.SetStateAction<ChannelFormData>>;
  isEditing: boolean;
  isSubmitting: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-text-primary">
            {isEditing ? 'Edit Channel' : 'Create Channel'}
          </h3>
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
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. General"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">Emoji</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData((prev) => ({ ...prev, emoji: e.target.value }))}
                placeholder="💬"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Language</label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData((prev) => ({ ...prev, language: e.target.value }))}
                placeholder="en"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="What is this channel about?"
              rows={3}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Sort Order</label>
            <input
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value, 10) || 0 }))
              }
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">Min Level (0 = no restriction)</label>
              <input
                type="number"
                value={formData.minLevel}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, minLevel: parseInt(e.target.value, 10) || 0 }))
                }
                min="0"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Min Wagered (0 = no restriction)</label>
              <input
                type="number"
                value={formData.minWagered}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, minWagered: parseInt(e.target.value, 10) || 0 }))
                }
                min="0"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-border bg-input text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-sm text-text-primary">
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
            onClick={onSubmit}
            disabled={isSubmitting || !formData.name.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  channelName,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  channelName: string;
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
          <h3 className="text-lg font-bold text-text-primary">Delete Channel</h3>
        </div>
        <p className="text-sm text-text-muted mb-6">
          Are you sure you want to delete <span className="text-text-primary font-medium">{channelName}</span>?
          This action cannot be undone. All messages in this channel will be permanently removed.
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChannelListPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formData, setFormData] = useState<ChannelFormData>(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Channel[]>('/channels');
      setChannels(res.data);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to load channels';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const openCreateModal = () => {
    setEditingChannel(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (channel: Channel) => {
    setEditingChannel(channel);
    const s = (channel.settings as any) || {};
    setFormData({
      name: channel.name,
      emoji: channel.emoji,
      language: channel.language,
      description: channel.description || '',
      isActive: channel.isActive,
      sortOrder: channel.sortOrder,
      minLevel: s.minLevel || 0,
      minWagered: s.minWagered || 0,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingChannel(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        emoji: formData.emoji.trim() || '💬',
        language: formData.language.trim() || 'en',
        description: formData.description.trim(),
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
        settings: {
          minLevel: formData.minLevel || 0,
          minWagered: formData.minWagered || 0,
        },
      };

      if (editingChannel) {
        await api.put(`/channels/${editingChannel.id}`, payload);
      } else {
        await api.post('/channels', payload);
      }
      closeModal();
      await fetchChannels();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Operation failed';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/channels/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchChannels();
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to delete channel';
      alert(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
        <button
          onClick={fetchChannels}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Channels</h2>
          <p className="text-sm text-text-muted mt-1">
            {channels.length} channel{channels.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={16} />
          New Channel
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-text-muted text-sm">
              <th className="p-4">Channel</th>
              <th className="p-4">Language</th>
              <th className="p-4">Status</th>
              <th className="p-4">Restrictions</th>
              <th className="p-4">Sort Order</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((ch) => (
              <tr key={ch.id} className="border-b border-border/50 hover:bg-hover transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ch.emoji}</span>
                    <div>
                      <div className="text-text-primary font-medium">{ch.name}</div>
                      {ch.description && (
                        <div className="text-text-muted text-xs mt-0.5 max-w-xs truncate">
                          {ch.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-text-secondary text-sm">{ch.language}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ch.isActive
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-red-900/30 text-red-400'
                    }`}
                  >
                    {ch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 flex-wrap">
                    {((ch.settings as any)?.minLevel || 0) > 0 && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">
                        Lv.{(ch.settings as any).minLevel}+
                      </span>
                    )}
                    {((ch.settings as any)?.minWagered || 0) > 0 && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400">
                        Wager {(ch.settings as any).minWagered}+
                      </span>
                    )}
                    {!((ch.settings as any)?.minLevel > 0) && !((ch.settings as any)?.minWagered > 0) && (
                      <span className="text-xs text-text-muted">None</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-text-muted text-sm">{ch.sortOrder}</td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(ch)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-indigo-400 hover:bg-indigo-900/20 transition-colors"
                      title="Edit channel"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(ch)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-900/20 transition-colors"
                      title="Delete channel"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-text-muted">
                  <p className="mb-2">No channels found</p>
                  <button
                    onClick={openCreateModal}
                    className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
                  >
                    Create your first channel
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ChannelModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        isEditing={!!editingChannel}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        channelName={deleteTarget?.name || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}
