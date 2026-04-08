import React, { useEffect, useState, useCallback } from 'react';
import { Shield, X, Plus, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../api/client';

// --- Interfaces ---

type MatchType = 'EXACT' | 'WILDCARD' | 'REGEX';

interface BannedWord {
  id: string;
  word: string;
  matchType: MatchType;
  createdAt: string;
}

type ModerationAction = 'MUTE' | 'BAN' | 'DELETE' | 'WARN' | 'UNBAN' | 'UNMUTE';

interface ModerationLog {
  id: string;
  action: ModerationAction;
  reason: string | null;
  durationMinutes: number | null;
  targetPlayer?: { username: string } | null;
  moderator?: { email: string } | null;
  createdAt: string;
}

// --- Constants ---

const MATCH_TYPE_OPTIONS: { value: MatchType; label: string }[] = [
  { value: 'EXACT', label: 'Exact' },
  { value: 'WILDCARD', label: 'Wildcard' },
  { value: 'REGEX', label: 'Regex' },
];

const MATCH_TYPE_COLORS: Record<MatchType, string> = {
  EXACT: 'bg-blue-900/30 text-blue-400',
  WILDCARD: 'bg-purple-900/30 text-purple-400',
  REGEX: 'bg-amber-900/30 text-amber-400',
};

const ACTION_COLORS: Record<ModerationAction, string> = {
  MUTE: 'bg-yellow-900/30 text-yellow-400',
  BAN: 'bg-red-900/30 text-red-400',
  DELETE: 'bg-orange-900/30 text-orange-400',
  WARN: 'bg-blue-900/30 text-blue-400',
  UNBAN: 'bg-green-900/30 text-green-400',
  UNMUTE: 'bg-green-900/30 text-green-400',
};

// --- Component ---

export function ModerationPage() {
  // Banned words state
  const [bannedWords, setBannedWords] = useState<BannedWord[]>([]);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [wordsError, setWordsError] = useState<string | null>(null);
  const [newWord, setNewWord] = useState('');
  const [newMatchType, setNewMatchType] = useState<MatchType>('EXACT');
  const [addingWord, setAddingWord] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Moderation logs state
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // --- Data fetching ---

  const fetchBannedWords = useCallback(async () => {
    setWordsLoading(true);
    setWordsError(null);
    try {
      const res = await api.get('/moderation/banned-words');
      setBannedWords(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setWordsError(err.response?.data?.message || 'Failed to load banned words');
    } finally {
      setWordsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await api.get('/moderation/logs', { params: { limit: 50 } });
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setLogsError(err.response?.data?.message || 'Failed to load moderation logs');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBannedWords();
    fetchLogs();
  }, [fetchBannedWords, fetchLogs]);

  // --- Actions ---

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWord.trim();
    if (!trimmed) return;

    setAddingWord(true);
    try {
      const res = await api.post('/moderation/banned-words', {
        word: trimmed,
        matchType: newMatchType,
      });
      setBannedWords((prev) => [...prev, res.data]);
      setNewWord('');
      setNewMatchType('EXACT');
    } catch (err: any) {
      setWordsError(err.response?.data?.message || 'Failed to add banned word');
    } finally {
      setAddingWord(false);
    }
  };

  const handleDeleteWord = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/moderation/banned-words/${id}`);
      setBannedWords((prev) => prev.filter((w) => w.id !== id));
    } catch (err: any) {
      setWordsError(err.response?.data?.message || 'Failed to delete banned word');
    } finally {
      setDeletingId(null);
    }
  };

  // --- Helpers ---

  const formatDuration = (minutes: number | null) => {
    if (minutes == null) return '—';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --- Render ---

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-text-muted" />
        <h2 className="text-xl font-bold text-text-primary">Moderation</h2>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ========== Banned Words Section ========== */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Banned Words</h3>
            <button
              onClick={fetchBannedWords}
              disabled={wordsLoading}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${wordsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Add word form */}
          <form onSubmit={handleAddWord} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Enter word or pattern…"
              className="flex-1 bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={newMatchType}
              onChange={(e) => setNewMatchType(e.target.value as MatchType)}
              className="bg-[#1F2937] border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {MATCH_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={addingWord || !newWord.trim()}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {addingWord ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add
            </button>
          </form>

          {/* Error */}
          {wordsError && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-3 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{wordsError}</span>
              <button onClick={() => setWordsError(null)} className="ml-auto">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Word list */}
          {wordsLoading && bannedWords.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading banned words…
            </div>
          ) : bannedWords.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">
              No banned words configured yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto">
              {bannedWords.map((bw) => (
                <span
                  key={bw.id}
                  className="inline-flex items-center gap-1.5 bg-[#1F2937] border border-border rounded-lg px-3 py-1.5 text-sm group"
                >
                  <span className="text-text-primary font-mono">{bw.word}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${MATCH_TYPE_COLORS[bw.matchType]}`}
                  >
                    {bw.matchType}
                  </span>
                  <button
                    onClick={() => handleDeleteWord(bw.id)}
                    disabled={deletingId === bw.id}
                    className="ml-1 text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Remove"
                  >
                    {deletingId === bw.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
              ))}
            </div>
          )}

          {bannedWords.length > 0 && (
            <p className="text-text-muted text-xs mt-3">
              {bannedWords.length} word{bannedWords.length !== 1 ? 's' : ''} banned
            </p>
          )}
        </div>

        {/* ========== Moderation Logs Section ========== */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">Moderation Log</h3>
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Error */}
          {logsError && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-3 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{logsError}</span>
              <button onClick={() => setLogsError(null)} className="ml-auto">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Logs table */}
          {logsLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-text-muted">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading moderation logs…
            </div>
          ) : logs.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">
              No moderation actions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-text-muted">
                    <th className="pb-3 pr-3 font-medium">Action</th>
                    <th className="pb-3 pr-3 font-medium">Target</th>
                    <th className="pb-3 pr-3 font-medium">Moderator</th>
                    <th className="pb-3 pr-3 font-medium">Reason</th>
                    <th className="pb-3 pr-3 font-medium">Duration</th>
                    <th className="pb-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border/30 hover:bg-hover transition-colors"
                    >
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLORS[log.action] || 'bg-gray-900/30 text-gray-400'}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-text-primary">
                        {log.targetPlayer?.username || '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-text-muted">
                        {log.moderator?.email || 'System'}
                      </td>
                      <td className="py-2.5 pr-3 text-text-secondary max-w-[200px] truncate">
                        {log.reason || '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-text-muted">
                        {formatDuration(log.durationMinutes)}
                      </td>
                      <td className="py-2.5 text-text-muted whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {logs.length > 0 && (
            <p className="text-text-muted text-xs mt-3">
              Showing {logs.length} most recent action{logs.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
