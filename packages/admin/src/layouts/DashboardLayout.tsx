import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Shield,
  BarChart3,
  Settings,
  LogOut,
  Gift,
  HelpCircle,
  CloudRain,
  Trophy,
  Building2,
  UserCog,
  Code2,
  Eye,
  Radio,
  Coins,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  superAdminOnly?: boolean;
  tenantOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/channels', label: 'Channels', icon: MessageSquare, tenantOnly: true },
  { to: '/players', label: 'Players', icon: Users, tenantOnly: true },
  { to: '/moderation', label: 'Moderation', icon: Shield, tenantOnly: true },
  { to: '/promos', label: 'Promos', icon: Gift, tenantOnly: true },
  { to: '/trivia', label: 'Trivia', icon: HelpCircle, tenantOnly: true },
  { to: '/rain', label: 'Rain', icon: CloudRain, tenantOnly: true },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy, tenantOnly: true },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, tenantOnly: true },
  { to: '/integration', label: 'Integration', icon: Code2, tenantOnly: true },
  { to: '/live-chat', label: 'Live Chat', icon: Radio, tenantOnly: true },
  { to: '/chat-preview', label: 'Chat Preview', icon: Eye, tenantOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/super-admin/tenants', label: 'Tenants', icon: Building2, superAdminOnly: true },
  { to: '/super-admin/admins', label: 'Admins', icon: UserCog, superAdminOnly: true },
  { to: '/super-admin/currencies', label: 'Currencies', icon: Coins, superAdminOnly: true },
];

export function DashboardLayout() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.isSuperAdmin === true;
  const isImpersonating = !!sessionStorage.getItem('superadmin_token');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleExitImpersonation = () => {
    const saToken = sessionStorage.getItem('superadmin_token');
    const saUser = sessionStorage.getItem('superadmin_user');
    if (saToken && saUser) {
      login(saToken, JSON.parse(saUser));
      sessionStorage.removeItem('superadmin_token');
      sessionStorage.removeItem('superadmin_user');
      navigate('/super-admin/tenants');
    }
  };

  const visibleItems = navItems.filter((item) => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.tenantOnly && isSuperAdmin) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-page">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-text-primary">CasinoChat</h1>
          <p className="text-xs text-text-muted mt-1">
            {isSuperAdmin ? 'Platform Admin' : 'Admin Panel'}
          </p>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1 ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-text-secondary hover:bg-hover hover:text-text-primary'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.email}</p>
              <p className="text-xs text-text-muted">
                {isSuperAdmin && <span className="text-indigo-400">Super </span>}
                {user?.role}
              </p>
            </div>
            <button onClick={handleLogout} className="text-text-muted hover:text-red-400 p-1">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {isImpersonating && (
          <div className="bg-amber-600 text-white px-4 py-2 text-sm flex items-center justify-between">
            <span>
              You are viewing as <strong>{user?.email}</strong> (impersonating tenant)
            </span>
            <button
              onClick={handleExitImpersonation}
              className="bg-white text-amber-700 px-3 py-1 rounded text-xs font-bold"
            >
              Exit Impersonation
            </button>
          </div>
        )}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
