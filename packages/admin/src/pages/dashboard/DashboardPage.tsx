import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/auth';
import api from '../../api/client';
import { Users, MessageSquare, Radio, BarChart3 } from 'lucide-react';

interface Stats {
  totalPlayers?: number;
  totalMessages?: number;
  messagesToday?: number;
  activeChannels?: number;
  onlineLast24h?: number;
  tenants?: number;
  activeTenants?: number;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-muted text-sm">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (user?.isSuperAdmin) {
          const res = await api.get('/super-admin/dashboard');
          setStats(res.data);
        } else if (user?.tenantId) {
          const res = await api.get(`/tenants/${user.tenantId}/analytics/overview`);
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, [user]);

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.isSuperAdmin ? (
          <>
            <StatCard label="Total Tenants" value={stats.tenants || 0} icon={BarChart3} color="bg-indigo-600" />
            <StatCard label="Active Tenants" value={stats.activeTenants || 0} icon={Radio} color="bg-green-600" />
            <StatCard label="Total Players" value={stats.totalPlayers || 0} icon={Users} color="bg-blue-600" />
            <StatCard label="Total Messages" value={stats.totalMessages || 0} icon={MessageSquare} color="bg-purple-600" />
          </>
        ) : (
          <>
            <StatCard label="Total Players" value={stats.totalPlayers || 0} icon={Users} color="bg-indigo-600" />
            <StatCard label="Messages Today" value={stats.messagesToday || 0} icon={MessageSquare} color="bg-green-600" />
            <StatCard label="Active Channels" value={stats.activeChannels || 0} icon={Radio} color="bg-blue-600" />
            <StatCard label="Online (24h)" value={stats.onlineLast24h || 0} icon={BarChart3} color="bg-purple-600" />
          </>
        )}
      </div>
    </div>
  );
}
