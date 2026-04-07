import React, { useEffect, useState } from 'react';
import api from '../../api/client';

interface Player {
  id: string;
  username: string;
  level: number;
  vipStatus: string;
  isPremium: boolean;
  isModerator: boolean;
  lastSeenAt: string | null;
}

const VIP_COLORS: Record<string, string> = {
  DIAMOND: 'text-cyan-300',
  PLATINUM: 'text-gray-300',
  GOLD: 'text-yellow-400',
  SILVER: 'text-gray-400',
  BRONZE: 'text-orange-400',
  NONE: 'text-text-muted',
};

export function PlayerListPage() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    api.get('/players').then((res) => setPlayers(res.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-6">Players</h2>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-text-muted text-sm">
              <th className="p-4">Player</th>
              <th className="p-4">Level</th>
              <th className="p-4">VIP</th>
              <th className="p-4">Flags</th>
              <th className="p-4">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-hover transition-colors">
                <td className="p-4 text-text-primary font-medium">{p.username}</td>
                <td className="p-4 text-text-secondary">{p.level}</td>
                <td className={`p-4 font-medium ${VIP_COLORS[p.vipStatus] || ''}`}>{p.vipStatus}</td>
                <td className="p-4">
                  <div className="flex gap-1">
                    {p.isPremium && <span className="bg-purple-900/30 text-purple-400 text-xs px-2 py-0.5 rounded">Premium</span>}
                    {p.isModerator && <span className="bg-green-900/30 text-green-400 text-xs px-2 py-0.5 rounded">Mod</span>}
                  </div>
                </td>
                <td className="p-4 text-text-muted text-sm">
                  {p.lastSeenAt ? new Date(p.lastSeenAt).toLocaleString() : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
