import React, { useEffect, useState } from 'react';
import api from '../../api/client';
import { useAuth } from '../../store/auth';

interface Channel {
  id: string;
  name: string;
  emoji: string;
  language: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export function ChannelListPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/channels', { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } });
        setChannels(res.data);
      } catch (err) { console.error(err); }
    };
    fetch();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">Channels</h2>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm">
          + New Channel
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-text-muted text-sm">
              <th className="p-4">Channel</th>
              <th className="p-4">Language</th>
              <th className="p-4">Status</th>
              <th className="p-4">Order</th>
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
                      <div className="text-text-muted text-xs">{ch.description}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-text-secondary text-sm">{ch.language}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${ch.isActive ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {ch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-text-muted text-sm">{ch.sortOrder}</td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-text-muted">No channels found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
