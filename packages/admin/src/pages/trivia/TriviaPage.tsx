import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, HelpCircle, Send } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';

interface Channel {
  id: string;
  name: string;
}

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  rewardAmount: number;
  rewardCurrency: string;
  difficulty: Difficulty;
  isActive: boolean;
  createdAt: string;
}

interface TriviaFormData {
  question: string;
  options: string[];
  correctIndex: number;
  rewardAmount: number;
  rewardCurrency: string;
  difficulty: Difficulty;
}

const defaultForm: TriviaFormData = {
  question: '',
  options: ['', ''],
  correctIndex: 0,
  rewardAmount: 0,
  rewardCurrency: 'USD',
  difficulty: 'EASY',
};

const difficultyColors: Record<Difficulty, string> = {
  EASY: 'bg-green-900/30 text-green-400',
  MEDIUM: 'bg-yellow-900/30 text-yellow-400',
  HARD: 'bg-red-900/30 text-red-400',
};

export function TriviaPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTrivia, setEditingTrivia] = useState<TriviaQuestion | null>(null);
  const [formData, setFormData] = useState<TriviaFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sendToChat, setSendToChat] = useState<TriviaQuestion | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const tenantId = user?.tenantId;

  const fetchTrivia = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/tenants/${tenantId}/trivia`);
      setQuestions(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load trivia questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrivia();
  }, [tenantId]);

  const openCreate = () => {
    setFormData(defaultForm);
    setShowCreateModal(true);
  };

  const openEdit = (trivia: TriviaQuestion) => {
    setEditingTrivia(trivia);
    setFormData({
      question: trivia.question,
      options: [...trivia.options],
      correctIndex: trivia.correctIndex,
      rewardAmount: trivia.rewardAmount,
      rewardCurrency: trivia.rewardCurrency || 'USD',
      difficulty: trivia.difficulty,
    });
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setEditingTrivia(null);
    setFormData(defaultForm);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !formData.question.trim()) return;
    const filtered = formData.options.filter((o) => o.trim());
    if (filtered.length < 2) return;
    setSubmitting(true);
    try {
      await api.post(`/tenants/${tenantId}/trivia`, {
        ...formData,
        options: filtered,
        correctIndex: Math.min(formData.correctIndex, filtered.length - 1),
      });
      closeModals();
      await fetchTrivia();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create trivia question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !editingTrivia || !formData.question.trim()) return;
    const filtered = formData.options.filter((o) => o.trim());
    if (filtered.length < 2) return;
    setSubmitting(true);
    try {
      await api.patch(`/tenants/${tenantId}/trivia/${editingTrivia.id}`, {
        ...formData,
        options: filtered,
        correctIndex: Math.min(formData.correctIndex, filtered.length - 1),
      });
      closeModals();
      await fetchTrivia();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update trivia question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!tenantId) return;
    try {
      await api.delete(`/tenants/${tenantId}/trivia/${id}`);
      setConfirmDelete(null);
      await fetchTrivia();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate trivia question');
    }
  };

  const openSendToChat = async (trivia: TriviaQuestion) => {
    setSendToChat(trivia);
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
      const opts = sendToChat.options;
      const lines = [
        `🧠 TRIVIA: ${sendToChat.question}`,
        ...opts.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`),
        '',
        'Reply with your answer!',
      ];
      await api.post(`/tenants/${tenantId}/channels/${selectedChannel}/messages`, {
        text: lines.join('\n'),
        type: 'TEXT',
        source: 'SYSTEM',
      });
      setSendToChat(null);
      setSuccessMsg('Trivia sent to chat successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send trivia to chat');
    } finally {
      setSending(false);
    }
  };

  const updateOption = (index: number, value: string) => {
    setFormData((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });
  };

  const addOption = () => {
    if (formData.options.length >= 4) return;
    setFormData((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) return;
    setFormData((prev) => {
      const options = prev.options.filter((_, i) => i !== index);
      const correctIndex = prev.correctIndex >= options.length ? options.length - 1 : prev.correctIndex;
      return { ...prev, options, correctIndex };
    });
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-text-muted text-sm mb-1">Question *</label>
        <input
          type="text"
          required
          value={formData.question}
          onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
          className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="What is the largest casino in the world?"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-text-muted text-sm">Options (2-4) *</label>
          {formData.options.length < 4 && (
            <button
              type="button"
              onClick={addOption}
              className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
            >
              + Add Option
            </button>
          )}
        </div>
        <div className="space-y-2">
          {formData.options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, correctIndex: idx }))}
                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  formData.correctIndex === idx
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-border text-text-muted hover:border-text-muted'
                }`}
                title={formData.correctIndex === idx ? 'Correct answer' : 'Set as correct'}
              >
                <span className="text-xs font-bold">{String.fromCharCode(65 + idx)}</span>
              </button>
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                className="flex-1 bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              />
              {formData.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="p-2 text-text-muted hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-text-muted text-xs mt-1">Click the letter circle to mark the correct answer</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-text-muted text-sm mb-1">Reward Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.rewardAmount}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, rewardAmount: parseFloat(e.target.value) || 0 }))
            }
            className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-text-muted text-sm mb-1">Currency</label>
          <input
            type="text"
            value={formData.rewardCurrency}
            onChange={(e) => setFormData((prev) => ({ ...prev, rewardCurrency: e.target.value }))}
            className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="USD"
          />
        </div>
        <div>
          <label className="block text-text-muted text-sm mb-1">Difficulty</label>
          <select
            value={formData.difficulty}
            onChange={(e) => setFormData((prev) => ({ ...prev, difficulty: e.target.value as Difficulty }))}
            className="w-full bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
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
          disabled={submitting || !formData.question.trim() || formData.options.filter((o) => o.trim()).length < 2}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? 'Update Question' : 'Create Question'}
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">Trivia Questions</h2>
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Question
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
                <th className="p-4">Question</th>
                <th className="p-4">Difficulty</th>
                <th className="p-4">Reward</th>
                <th className="p-4">Options</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id} className="border-b border-border/50 hover:bg-hover transition-colors">
                  <td className="p-4">
                    <div className="text-text-primary font-medium text-sm max-w-xs truncate">
                      {q.question}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${difficultyColors[q.difficulty]}`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="p-4 text-text-secondary text-sm">
                    {q.rewardAmount > 0 ? `${q.rewardAmount} ${q.rewardCurrency}` : '-'}
                  </td>
                  <td className="p-4 text-text-muted text-sm">
                    {q.options.length} options
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        q.isActive
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {q.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openSendToChat(q)}
                        className="p-2 text-text-muted hover:text-indigo-400 hover:bg-[#1E293B] rounded-lg transition-colors"
                        title="Start in Chat"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(q)}
                        className="p-2 text-text-muted hover:text-text-primary hover:bg-[#1E293B] rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {q.isActive && (
                        <>
                          {confirmDelete === q.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeactivate(q.id)}
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
                              onClick={() => setConfirmDelete(q.id)}
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
              {questions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <HelpCircle className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-text-muted text-sm">No trivia questions yet</p>
                    <button
                      onClick={openCreate}
                      className="mt-3 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
                    >
                      Create your first question
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
              <h3 className="text-lg font-semibold text-text-primary">Create Trivia Question</h3>
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
      {editingTrivia && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-text-primary">Edit Trivia Question</h3>
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
              <h3 className="text-lg font-semibold text-text-primary">Start in Chat</h3>
              <button
                onClick={() => setSendToChat(null)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-text-secondary text-sm">
                Send trivia question to a channel:
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
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
